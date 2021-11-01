"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputPlayerIDs = exports.parsePlayerID = void 0;
const steamid_1 = __importDefault(require("steamid"));
function parsePlayerID(id) {
    function SteamID64(id) {
        try {
            const steam = new steamid_1.default(id);
            if (!steam.isValid())
                return;
            return steam.getSteamID64();
        }
        catch {
            return;
        }
    }
    const steamID64 = SteamID64(id);
    if (steamID64) {
        return {
            platform: "Steam",
            id: steamID64,
        };
    }
    else {
        return {
            platform: "PlayFab",
            id,
        };
    }
}
exports.parsePlayerID = parsePlayerID;
function outputPlayerIDs(ids, profileLinks = false, lookupPlayerFormat = false) {
    if (!Array.isArray(ids)) {
        if (lookupPlayerFormat)
            return `PlayFabID: ${ids === null || ids === void 0 ? void 0 : ids.playFabID}, EntityID: ${ids === null || ids === void 0 ? void 0 : ids.entityID}`;
        return `PlayFabID: ${ids === null || ids === void 0 ? void 0 : ids.playFabID}, SteamID: ${!profileLinks
            ? ids === null || ids === void 0 ? void 0 : ids.steamID
            : `[${ids === null || ids === void 0 ? void 0 : ids.steamID}](<http://steamcommunity.com/profiles/${ids === null || ids === void 0 ? void 0 : ids.steamID}>)`}`;
    }
    return ids
        .map((platform) => `${platform.platform}ID: ${platform.id}`)
        .join(", ");
}
exports.outputPlayerIDs = outputPlayerIDs;
