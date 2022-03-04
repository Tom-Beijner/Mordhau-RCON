"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerInfo = exports.LookupPlayers = exports.LookupPlayer = exports.Login = exports.CreateAccount = exports.titleId = void 0;
const fuse_js_1 = __importDefault(require("fuse.js"));
const playfab_sdk_1 = require("playfab-sdk");
const util_1 = require("util");
const Config_1 = __importDefault(require("../structures/Config"));
const logger_1 = __importDefault(require("../utils/logger"));
const PlayerID_1 = require("../utils/PlayerID");
const LoginWithCustomID = util_1.promisify(playfab_sdk_1.PlayFabClient.LoginWithCustomID);
const GetPlayFabIDsFromSteamIDs = util_1.promisify(playfab_sdk_1.PlayFabClient.GetPlayFabIDsFromSteamIDs);
const GetPlayerCombinedInfo = util_1.promisify(playfab_sdk_1.PlayFabClient.GetPlayerCombinedInfo);
const GetObjects = util_1.promisify(playfab_sdk_1.PlayFabData.GetObjects);
const GetServerList = util_1.promisify(playfab_sdk_1.PlayFabClient.GetCurrentGames);
const GetProfile = util_1.promisify(playfab_sdk_1.PlayFabProfiles.GetProfile);
const GetProfiles = util_1.promisify(playfab_sdk_1.PlayFabProfiles.GetProfiles);
exports.titleId = "12D56";
playfab_sdk_1.PlayFab.settings.titleId = exports.titleId;
async function CreateAccount(accountID) {
    const createRequest = {
        TitleId: playfab_sdk_1.PlayFab.settings.titleId,
        CustomId: accountID,
        CreateAccount: true,
    };
    logger_1.default.debug("PlayFab", `Creating account (ID: ${accountID})`);
    try {
        const data = await LoginWithCustomID(createRequest);
        if (data.data.NewlyCreated) {
            logger_1.default.debug("PlayFab", `Created account (ID: ${accountID})`);
        }
        else {
            logger_1.default.debug("PlayFab", `Account already exists (ID: ${accountID})`);
        }
    }
    catch (error) {
        const errorMessage = `Error occurred while creating account in (Error: ${CompileErrorReport(error)})`;
        return errorMessage;
    }
}
exports.CreateAccount = CreateAccount;
async function Login(accountID) {
    const loginRequest = {
        TitleId: playfab_sdk_1.PlayFab.settings.titleId,
        CustomId: accountID,
    };
    logger_1.default.debug("PlayFab", `Logging in (ID: ${accountID})`);
    try {
        await LoginWithCustomID(loginRequest);
        logger_1.default.debug("PlayFab", `Logged in (ID: ${accountID})`);
    }
    catch (error) {
        const errorMessage = `Error occurred while logging in (Error: ${CompileErrorReport(error)})`;
        return errorMessage;
    }
}
exports.Login = Login;
function CompileErrorReport(error) {
    if (error == null)
        return "";
    let fullErrors = error.errorMessage;
    for (const paramName in error.errorDetails)
        for (const msgIdx in error.errorDetails[paramName])
            fullErrors +=
                "\n" + paramName + ": " + error.errorDetails[paramName][msgIdx];
    return fullErrors;
}
async function GetPlayFabIDs(ids) {
    return (await GetPlayFabIDsFromSteamIDs({ SteamStringIDs: ids })).data.Data;
}
async function LookupPlayer(id) {
    var _a, _b, _c, _d;
    try {
        logger_1.default.debug("PlayFab", `Running LookupPlayer on ${id}`);
        if (PlayerID_1.SteamID64(id)) {
            const steamID = id;
            id = (await GetPlayFabIDs([id]))[0].PlayFabId;
            if (!id) {
                logger_1.default.debug("PlayFab", `Could not find PlayFabID with SteamID ${steamID}, probably doesn't own the game`);
                return null;
            }
        }
        try {
            id = (await GetPlayerCombinedInfo({
                PlayFabID: id,
                InfoRequestParameters: {
                    GetUserAccountInfo: true,
                },
            })).data.InfoResultPayload.AccountInfo.TitleInfo.TitlePlayerAccount
                .Id;
        }
        catch { }
        const player = (_d = (_c = (_b = (_a = (await GetProfile({
            Entity: {
                Id: id,
                Type: "title_player_account",
            },
            DataAsObject: true,
        })).data) === null || _a === void 0 ? void 0 : _a.Profile) === null || _b === void 0 ? void 0 : _b.Objects) === null || _c === void 0 ? void 0 : _c.AccountInfo) === null || _d === void 0 ? void 0 : _d.DataObject;
        if (!player) {
            logger_1.default.debug("PlayFab", `Could not fetch profile for ${id}`);
            return null;
        }
        logger_1.default.debug("PlayFab", `Ran LookupPlayer on ${player.Name} (PlayFabID: ${player.PlayFabId}, SteamID: ${player.PlatformAccountId})`);
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
    }
    catch (error) {
        logger_1.default.error("Website", `Error occurred while running LookupPlayer (Error: ${CompileErrorReport(error)}, ID: ${id})`);
        const err = await Login(Config_1.default.get("mordhau.accountId"));
        if (err)
            logger_1.default.error("PlayFab", err);
        return;
    }
}
exports.LookupPlayer = LookupPlayer;
async function LookupPlayers(entityIDs) {
    try {
        const chunkSize = 25;
        const entitiesLength = entityIDs.length;
        const profiles = [];
        logger_1.default.debug("PlayFab", `Running LookupPlayers on ${entityIDs.length} entities`);
        for (let i = 0; i < entitiesLength; i += chunkSize) {
            const chunk = entityIDs.slice(i, i + chunkSize);
            profiles.push((await GetProfiles({
                Entities: chunk.map((id) => ({
                    Id: id,
                    Type: "title_player_account",
                })),
                DataAsObject: true,
            })).data.Profiles.map(({ Objects: { AccountInfo: { DataObject: profile }, }, }) => profile));
        }
        logger_1.default.debug("PlayFab", `Finished LookupPlayers on ${entityIDs.length} entities`);
        return profiles.flatMap((profile) => profile.map((player) => ({
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
        })));
    }
    catch (error) {
        logger_1.default.error("PlayFab", `Error occurred while running LookupPlayers (Error: ${CompileErrorReport(error)}`);
        const err = await Login(Config_1.default.get("mordhau.accountId"));
        if (err)
            logger_1.default.error("PlayFab", err);
        return;
    }
}
exports.LookupPlayers = LookupPlayers;
async function getServerInfo(server) {
    var _a;
    try {
        if (!server.name)
            return null;
        const data = (_a = new fuse_js_1.default((await GetServerList({})).data.Games, {
            threshold: 0.4,
            keys: ["Tags.ServerName", "ServerIPV4Address"],
        }).search(`${server.name} ${server.host}`)[0]) === null || _a === void 0 ? void 0 : _a.item;
        return data;
    }
    catch (error) {
        logger_1.default.error("PlayFab", `Error occurred while running getServerInfo (Error: ${CompileErrorReport(error)}, Server: ${server.name})`);
        const err = await Login(Config_1.default.get("mordhau.accountId"));
        if (err)
            logger_1.default.error("PlayFab", err);
        return;
    }
}
exports.getServerInfo = getServerInfo;
