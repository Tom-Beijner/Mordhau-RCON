import fetch from "node-fetch";
import { mordhau } from "../config.json";

async function getPlayerData(id: string, requestData: any) {
    try {
        const loginResponse = await loginWithCustomID();

        const body = {
            InfoRequestParameters: {
                ...requestData,
            },
            PlayFabId: id,
        };

        const res = await fetch(
            `https://${mordhau.titleId}.playfabapi.com/Client/GetPlayerCombinedInfo`,
            {
                method: "POST",
                headers: {
                    "X-Authorization": loginResponse.data.SessionTicket,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        return await res.json();
    } catch {
        return null;
    }
}

async function getPlayFabIdsFromSteamIds(
    ids: string[]
): Promise<string[] | null[]> {
    try {
        const loginResponse = await loginWithCustomID();

        const body = {
            SteamIds: ids,
        };

        const res = await fetch(
            `https://${mordhau.titleId}.playfabapi.com/Client/GetPlayFabIdsFromSteamIds`,
            {
                method: "POST",
                headers: {
                    "X-Authorization": loginResponse.data.SessionTicket,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        const json = await res.json();

        return json.data.Data.map((data) =>
            !data.PlayFabId ? null : data.PlayFabId
        );
    } catch {
        return [null];
    }
}

async function getPlayFabIdFromSteamId(id: string): Promise<string | null> {
    return (await getPlayFabIdsFromSteamIds([id]))[0];
}

async function loginWithCustomID() {
    const body = {
        TitleId: mordhau.titleId,
        CustomId: "SteamPlayFabConverter",
        CreateAccount: false,
    };

    const res = await fetch(
        `https://${mordhau.titleId}.playfabapi.com/Client/LoginWithCustomID`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    const json = await res.json();

    return json;
}

export default {
    getPlayerData,
    getPlayFabIdFromSteamId,
    getPlayFabIdsFromSteamIds,
};
