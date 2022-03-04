import SteamID from "steamid";
import { platforms } from "../models/logSchema";

interface IPlayerPlatformData {
    platform: platforms;
    id: string;
}

function SteamID64(id: string): string | null {
    try {
        const steam = new SteamID(id);
        if (!steam.isValid()) return;
        return steam.getSteamID64();
    } catch {
        return;
    }
}

function parsePlayerID(id: string): IPlayerPlatformData {
    const steamID64 = SteamID64(id);

    if (steamID64) {
        return {
            platform: "Steam",
            id: steamID64,
        };
    } else {
        return {
            platform: "PlayFab",
            id,
        };
    }
}

function outputPlayerIDs(
    ids:
        | IPlayerPlatformData[]
        | { entityID?: string; playFabID: string; steamID?: string },
    profileLinks: boolean = false,
    lookupPlayerFormat: boolean = false
): string {
    if (!Array.isArray(ids)) {
        if (lookupPlayerFormat)
            return `PlayFabID: ${ids?.playFabID}, EntityID: ${ids?.entityID}`;

        return `PlayFabID: ${ids?.playFabID}, SteamID: ${
            !profileLinks
                ? ids?.steamID
                : `[${ids?.steamID}](<http://steamcommunity.com/profiles/${ids?.steamID}>)`
        }`;
    }

    return ids
        .map((platform) => `${platform.platform}ID: ${platform.id}`)
        .join(", ");
}

export { SteamID64, parsePlayerID, outputPlayerIDs };
