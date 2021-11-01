"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const PlayFab_1 = require("../services/PlayFab");
async function getPlayerData(id, requestData) {
    try {
        const loginResponse = await loginWithCustomID();
        const body = {
            InfoRequestParameters: {
                ...requestData,
            },
            PlayFabId: id,
        };
        const res = await node_fetch_1.default(`https://${PlayFab_1.titleId}.playfabapi.com/Client/GetPlayerCombinedInfo`, {
            method: "POST",
            headers: {
                "X-Authorization": loginResponse.data.SessionTicket,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return await res.json();
    }
    catch {
        return null;
    }
}
async function getPlayFabIdsFromSteamIds(ids) {
    try {
        const loginResponse = await loginWithCustomID();
        const body = {
            SteamIds: ids,
        };
        const res = await node_fetch_1.default(`https://${PlayFab_1.titleId}.playfabapi.com/Client/GetPlayFabIdsFromSteamIds`, {
            method: "POST",
            headers: {
                "X-Authorization": loginResponse.data.SessionTicket,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        return json.data.Data.map((data) => !data.PlayFabId ? null : data.PlayFabId);
    }
    catch {
        return [null];
    }
}
async function getPlayFabIdFromSteamId(id) {
    return (await getPlayFabIdsFromSteamIds([id]))[0];
}
async function loginWithCustomID() {
    const body = {
        TitleId: PlayFab_1.titleId,
        CustomId: "SteamPlayFabConverter",
        CreateAccount: false,
    };
    const res = await node_fetch_1.default(`https://${PlayFab_1.titleId}.playfabapi.com/Client/LoginWithCustomID`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
}
exports.default = {
    getPlayerData,
    getPlayFabIdFromSteamId,
    getPlayFabIdsFromSteamIds,
};
