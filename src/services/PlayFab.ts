import Fuse from "fuse.js";
import fetch from "node-fetch";
import {
    PlayFab,
    PlayFabClient,
    PlayFabData,
    PlayFabProfiles,
} from "playfab-sdk";
import { promisify } from "util";
import config from "../structures/Config";
import logger from "../utils/logger";
import { parsePlayerID, SteamID64 } from "../utils/PlayerID";

const LoginWithCustomID = promisify(PlayFabClient.LoginWithCustomID);
const GetPlayFabIDsFromSteamIDs = promisify(
    PlayFabClient.GetPlayFabIDsFromSteamIDs
);
const GetPlayerCombinedInfo = promisify(PlayFabClient.GetPlayerCombinedInfo);
const GetObjects = promisify(PlayFabData.GetObjects);
const GetServerList = promisify(PlayFabClient.GetCurrentGames);

const GetProfile = promisify(PlayFabProfiles.GetProfile);
const GetProfiles = promisify(PlayFabProfiles.GetProfiles);

export const titleId = "12D56";

PlayFab.settings.titleId = titleId;

async function CreateAccount(accountID: string) {
    const createRequest = {
        TitleId: PlayFab.settings.titleId,
        CustomId: accountID,
        CreateAccount: true,
    };

    logger.debug("PlayFab", `Creating account (ID: ${accountID})`);

    try {
        const data = await LoginWithCustomID(createRequest);

        if (data.data.NewlyCreated) {
            logger.debug("PlayFab", `Created account (ID: ${accountID})`);
        } else {
            logger.debug(
                "PlayFab",
                `Account already exists (ID: ${accountID})`
            );
        }
    } catch (error) {
        const errorMessage = `Error occurred while creating account in (Error: ${CompileErrorReport(
            error
        )})`;

        return errorMessage;
    }
}

async function Login(accountID: string) {
    const loginRequest = {
        // Currently, you need to look up the correct format for this object in the API-docs:
        // https://api.playfab.com/Documentation/Client/method/LoginWithCustomID
        TitleId: PlayFab.settings.titleId,
        CustomId: accountID,
    };

    logger.debug("PlayFab", `Logging in (ID: ${accountID})`);

    try {
        await LoginWithCustomID(loginRequest);

        logger.debug("PlayFab", `Logged in (ID: ${accountID})`);
    } catch (error) {
        const errorMessage = `Error occurred while logging in (Error: ${CompileErrorReport(
            error
        )})`;

        return errorMessage;
    }
}

// This is a utility function we haven't put into the core SDK yet.  Feel free to use it.
function CompileErrorReport(error: {
    errorMessage: any;
    errorDetails: { [x: string]: { [x: string]: string } };
}) {
    if (error == null) return "";
    let fullErrors = error.errorMessage;
    for (const paramName in error.errorDetails)
        for (const msgIdx in error.errorDetails[paramName])
            fullErrors +=
                "\n" + paramName + ": " + error.errorDetails[paramName][msgIdx];
    return fullErrors;
}

async function GetPlayFabIDs(ids: string[]) {
    return (await GetPlayFabIDsFromSteamIDs({ SteamStringIDs: ids })).data.Data;
}

async function LookupPlayer(id: string): Promise<{
    platform: {
        name: string;
        accountID: string;
    };
    ids: {
        entityID: string;
        playFabID: string;
        steamID: string;
    };
    id: string;
    name: string;
}> {
    try {
        logger.debug("PlayFab", `Running LookupPlayer on ${id}`);

        if (SteamID64(id)) {
            const steamID = id;
            id = (await GetPlayFabIDs([id]))[0].PlayFabId;

            if (!id) {
                logger.debug(
                    "PlayFab",
                    `Could not find PlayFabID with SteamID ${steamID}, probably doesn't own the game`
                );

                return null;
            }
        }

        try {
            id = (
                await GetPlayerCombinedInfo({
                    PlayFabID: id,
                    // @ts-ignore
                    InfoRequestParameters: {
                        GetUserAccountInfo: true,
                    },
                })
            ).data.InfoResultPayload.AccountInfo.TitleInfo.TitlePlayerAccount
                .Id;
        } catch {}

        const player = (
            await GetProfile({
                Entity: {
                    Id: id,
                    Type: "title_player_account",
                },
                DataAsObject: true,
            })
        ).data?.Profile?.Objects?.AccountInfo?.DataObject as {
            PlayFabId: string;
            EntityId: string;
            Platform: string;
            PlatformAccountId: string;
            Name: string;
            Type: string;
        };

        if (!player) {
            logger.debug("PlayFab", `Could not fetch profile for ${id}`);

            return null;
        }

        logger.debug(
            "PlayFab",
            `Ran LookupPlayer on ${player.Name} (PlayFabID: ${player.PlayFabId}, SteamID: ${player.PlatformAccountId})`
        );

        return {
            platform: {
                name: player.Platform,
                accountID: player.PlatformAccountId,
            },
            ids: {
                entityID: player.EntityId,
                playFabID: player.PlayFabId,
                steamID: player.PlatformAccountId,
            },
            id: player.PlayFabId,
            name: player.Name,
        };
    } catch (error) {
        logger.error(
            "Website",
            `Error occurred while running LookupPlayer (Error: ${CompileErrorReport(
                error
            )}, ID: ${id})`
        );

        const err = await Login(config.get("mordhau.accountId"));
        if (err) logger.error("PlayFab", err);

        return;
    }
}

// Only allow entity IDs to lower the calls to the API
async function LookupPlayers(entityIDs: string[]): Promise<
    {
        platform: {
            name: string;
            accountID: string;
        };
        ids: {
            entityID: string;
            playFabID: string;
            steamID: string;
        };
        id: string;
        name: string;
    }[]
> {
    try {
        const chunkSize = 25;
        const entitiesLength = entityIDs.length;
        const profiles: {
            PlayFabId: string;
            EntityId: string;
            Platform: string;
            PlatformAccountId: string;
            Name: string;
            Type: string;
        }[][] = [];

        logger.debug(
            "PlayFab",
            `Running LookupPlayers on ${entityIDs.length} entities`
        );

        for (let i = 0; i < entitiesLength; i += chunkSize) {
            const chunk = entityIDs.slice(i, i + chunkSize);

            profiles.push(
                (
                    await GetProfiles({
                        Entities: chunk.map((id) => ({
                            Id: id,
                            Type: "title_player_account",
                        })),
                        DataAsObject: true,
                    })
                ).data.Profiles.map(
                    ({
                        Objects: {
                            AccountInfo: { DataObject: profile },
                        },
                    }) =>
                        profile as {
                            PlayFabId: string;
                            EntityId: string;
                            Platform: string;
                            PlatformAccountId: string;
                            Name: string;
                            Type: string;
                        }
                )
            );
        }

        logger.debug(
            "PlayFab",
            `Finished LookupPlayers on ${entityIDs.length} entities`
        );

        return profiles.flatMap((profile) =>
            profile.map((player) => ({
                platform: {
                    name: player.Platform,
                    accountID: player.PlatformAccountId,
                },
                ids: {
                    entityID: player.EntityId,
                    playFabID: player.PlayFabId,
                    steamID: player.PlatformAccountId,
                },
                id: player.PlayFabId,
                name: player.Name,
            }))
        );
    } catch (error) {
        logger.error(
            "PlayFab",
            `Error occurred while running LookupPlayers (Error: ${CompileErrorReport(
                error
            )}`
        );

        const err = await Login(config.get("mordhau.accountId"));
        if (err) logger.error("PlayFab", err);

        return;
    }
}

async function getServerInfo(server: {
    name: string;
    host: string;
    port: number;
}) {
    try {
        if (!server.name) return null;

        // const result = await GetServerList({
        //     TagFilter: {
        //         Includes: [
        //             {
        //                 Data: {
        //                     ServerName: server.name,
        //                 },
        //             },
        //         ],
        //     },
        // });

        // const data = result.data.Games.find(
        //     (s) => s.ServerIPV4Address === server.host
        //     //  && s.ServerPort === server.port
        // );

        const data = new Fuse((await GetServerList({})).data.Games, {
            threshold: 0.4,
            keys: ["Tags.ServerName", "ServerIPV4Address"],
        }).search(`${server.name} ${server.host}`)[0]?.item;

        return data;
    } catch (error) {
        logger.error(
            "PlayFab",
            `Error occurred while running getServerInfo (Error: ${CompileErrorReport(
                error
            )}, Server: ${server.name})`
        );

        const err = await Login(config.get("mordhau.accountId"));
        if (err) logger.error("PlayFab", err);

        return;
    }
}

export { CreateAccount, Login, LookupPlayer, LookupPlayers, getServerInfo };
