"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerInfo = exports.LookupPlayer = exports.Login = exports.CreateAccount = exports.titleId = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
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
exports.titleId = "12D56";
playfab_sdk_1.PlayFab.settings.titleId = exports.titleId;
async function CreateAccount() {
    const body = {
        TitleId: playfab_sdk_1.PlayFab.settings.titleId,
        CustomId: Config_1.default.get("mordhau.accountId"),
        CreateAccount: true,
    };
    const json = await (await node_fetch_1.default(`https://${body.TitleId}.playfabapi.com/Client/LoginWithCustomID`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })).json();
    return json.data.NewlyCreated;
}
exports.CreateAccount = CreateAccount;
async function Login() {
    const loginRequest = {
        TitleId: playfab_sdk_1.PlayFab.settings.titleId,
        CustomId: Config_1.default.get("mordhau.accountId"),
    };
    try {
        await LoginWithCustomID(loginRequest);
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
    for (let i = 0; i < 2; i++) {
        try {
            const playFabID = PlayerID_1.parsePlayerID(id).platform === "PlayFab"
                ? id
                : (await GetPlayFabIDs([id]))[0].PlayFabId;
            const entityID = (await GetPlayerCombinedInfo({
                PlayFabID: playFabID,
                InfoRequestParameters: {
                    GetUserAccountInfo: true,
                },
            })).data.InfoResultPayload.AccountInfo.TitleInfo.TitlePlayerAccount
                .Id;
            const playerRequest = {
                Entity: {
                    Id: entityID,
                    Type: "title_player_account",
                },
            };
            const result = await GetObjects(playerRequest);
            const player = result.data.Objects.AccountInfo.DataObject;
            logger_1.default.debug("PlayFab", `Ran LookupPlayer on ${player.Name} (PlayFabID: ${player.PlayFabId}, SteamID: ${player.PlatformAccountId})`);
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
        }
        catch (error) {
            logger_1.default.error("PlayFab", `Error occurred while running LookupPlayer (Error: ${CompileErrorReport(error)}, ID: ${id})`);
            const err = await Login();
            if (err)
                logger_1.default.error("PlayFab", err);
            return;
        }
    }
}
exports.LookupPlayer = LookupPlayer;
async function getServerInfo(server) {
    try {
        if (!server.name)
            return null;
        const result = await GetServerList({
            TagFilter: {
                Includes: [
                    {
                        Data: {
                            ServerName: server.name,
                        },
                    },
                ],
            },
        });
        const data = result.data.Games.find((s) => s.ServerIPV4Address === server.host);
        return data;
    }
    catch (error) {
        logger_1.default.error("PlayFab", `Error occurred while running getServerInfo (Error: ${CompileErrorReport(error)}, Server: ${server.name})`);
        const err = await Login();
        if (err)
            logger_1.default.error("PlayFab", err);
        return;
    }
}
exports.getServerInfo = getServerInfo;
