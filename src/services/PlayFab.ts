import Fuse from "fuse.js";
import fetch from "node-fetch";
import { PlayFab, PlayFabClient, PlayFabData } from "playfab-sdk";
import { promisify } from "util";
import config from "../structures/Config";
import logger from "../utils/logger";
import { parsePlayerID } from "../utils/PlayerID";

const LoginWithCustomID = promisify(PlayFabClient.LoginWithCustomID);
const GetPlayFabIDsFromSteamIDs = promisify(
    PlayFabClient.GetPlayFabIDsFromSteamIDs
);
const GetPlayerCombinedInfo = promisify(PlayFabClient.GetPlayerCombinedInfo);
const GetObjects = promisify(PlayFabData.GetObjects);
const GetServerList = promisify(PlayFabClient.GetCurrentGames);

export const titleId = "12D56";

PlayFab.settings.titleId = titleId;

export async function CreateAccount() {
    const body = {
        TitleId: PlayFab.settings.titleId,
        CustomId: config.get("mordhau.accountId"),
        CreateAccount: true,
    };

    const json = await (
        await fetch(
            `https://${body.TitleId}.playfabapi.com/Client/LoginWithCustomID`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }
        )
    ).json();

    return json.data.NewlyCreated;
}

export async function Login() {
    const loginRequest = {
        // Currently, you need to look up the correct format for this object in the API-docs:
        // https://api.playfab.com/Documentation/Client/method/LoginWithCustomID
        TitleId: PlayFab.settings.titleId,
        CustomId: config.get("mordhau.accountId") as string,
    };

    try {
        await LoginWithCustomID(loginRequest);
    } catch (error) {
        const errorMessage = `Error occurred while logging in (Error: ${CompileErrorReport(
            error
        )})`;

        return errorMessage;
    }
}

// This is a utility function we haven't put into the core SDK yet.  Feel free to use it.
function CompileErrorReport(error) {
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

export async function LookupPlayer(id: string) {
    // Hack if the first fails iterate again
    for (let i = 0; i < 2; i++) {
        try {
            const playFabID =
                parsePlayerID(id).platform === "PlayFab"
                    ? id
                    : (await GetPlayFabIDs([id]))[0].PlayFabId;

            const entityID = (
                await GetPlayerCombinedInfo({
                    PlayFabID: playFabID,
                    // @ts-ignore
                    InfoRequestParameters: {
                        GetUserAccountInfo: true,
                    },
                })
            ).data.InfoResultPayload.AccountInfo.TitleInfo.TitlePlayerAccount
                .Id;

            const playerRequest = {
                Entity: {
                    Id: entityID,
                    Type: "title_player_account",
                },
            };

            const result = await GetObjects(playerRequest);

            const player = result.data.Objects.AccountInfo.DataObject;

            logger.debug(
                "PlayFab",
                `Ran LookupPlayer on ${player.Name} (PlayFabID: ${player.PlayFabId}, SteamID: ${player.PlatformAccountId})`
            );

            return {
                ids: {
                    entityID: player.EntityId,
                    playFabID: player.PlayFabId,
                    steamID: player.PlatformAccountId,
                },
                id: player.PlayFabId,
                name: player.Name,
                platform: {
                    name: player.Platform,
                    accountID: player.PlatformAccountId,
                },
            };
        } catch (error) {
            logger.error(
                "PlayFab",
                `Error occurred while running LookupPlayer (Error: ${CompileErrorReport(
                    error
                )}, ID: ${id})`
            );

            const err = await Login();
            if (err) logger.error("PlayFab", err);

            return;
        }
    }
}

export async function getServerInfo(server: {
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

        const err = await Login();
        if (err) logger.error("PlayFab", err);

        return;
    }
}
