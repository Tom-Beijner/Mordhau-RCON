import config from "../config.json";
import { sendWebhookMessage } from "../services/Discord";
import logger from "../utils/logger";
import Rcon from "./Rcon";

export default class KillStreak {
    public cache: {
        players: Map<
            string,
            { player: { id: string; name: string }; kills: number }
        >;
        highestKillstreak: {
            player: { id: string; name: string };
            kills: number;
        } | null;
        canFirstBlood: boolean;
    } = {
        players: new Map(),
        highestKillstreak: null,
        canFirstBlood: false,
    };
    private rcon: Rcon;
    public serverName: string;

    constructor(rcon: Rcon, serverName: string) {
        this.rcon = rcon;
        this.serverName = serverName;
    }

    public sendMessage(message: string) {
        return sendWebhookMessage(
            this.rcon.webhooks.get("killstreak"),
            `${message} (Server: ${this.serverName})`
        );
    }

    public getKillstreak(id: string) {
        return (this.cache.players.get(id) || { kills: 0 }).kills;
    }

    public removeKillstreak(
        player: { id: string; name: string },
        killedBy?: { id: string; name: string }
    ) {
        const kills = this.getKillstreak(player.id);

        if (kills >= 5) {
            let message = "";
            if (killedBy)
                message = `${killedBy.name} ended ${player.name}'s killstreak of ${kills}!`;
            else
                message = `${player.name} ended their own killstreak of ${kills}!`;

            logger.debug(
                "Killstreak",
                `${message} (Server: ${this.serverName})`
            );

            if (process.env.NODE_ENV.trim() === "production") {
                this.rcon.say(message);
                this.sendMessage(message);
            }
        }

        this.cache.players.delete(player.id);

        return kills;
    }

    public clear() {
        this.cache.canFirstBlood = true;
        this.cache.highestKillstreak = null;
        this.cache.players.clear();
    }

    public async check(
        winner: { id: string; name: string },
        loser: { id: string; name: string }
    ) {
        if (!this.rcon.options.killstreaks.countBotKills && (!winner || !loser))
            return;

        let kills = this.getKillstreak(winner.id) + 1;

        this.cache.players.set(winner.id, {
            ...(this.cache.players.get(winner.id) || {
                player: { id: winner.id, name: winner.name },
            }),
            kills,
        });

        if (
            !this.cache.highestKillstreak ||
            this.cache.highestKillstreak.kills < kills
        )
            this.cache.highestKillstreak = { player: winner, kills };

        // Remove loser from the cache, resets kills
        const loserKills = this.removeKillstreak(loser, winner);

        let message = "";

        // switch (kills) {
        //     case 1:
        //         if (!this.cache.canFirstBlood) break;
        //         this.cache.canFirstBlood = false;
        //         message = `${winner.name} got first blood!`;
        //         break;
        //     case 5:
        //         message = `KILLING SPREE! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        //     case 10:
        //         message = `RAMPAGE! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        //     case 15:
        //         message = `DOMINATING! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        //     case 20:
        //         message = `UNSTOPPABLE! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        //     case 25:
        //         message = `GODLIKE! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        //     case 30:
        //         message = `WICKED SICK! ${winner.name} has a killstreak of ${kills}!`;
        //         break;
        // }

        if (kills === 1) {
            if (!this.cache.canFirstBlood) return;
            this.cache.canFirstBlood = false;
            message =
                config.killstreakMessages["1"] ||
                `${winner.name} got first blood!`;
        } else {
            for (const killsThreshhold in config.killstreakMessages) {
                if (parseInt(killsThreshhold) === kills) {
                    message = config.killstreakMessages[killsThreshhold];
                    break;
                }
            }
        }

        message = message
            .replace(/{name}/g, winner.name)
            .replace(/{kills}/g, kills.toString());

        logger.debug(
            "Killstreak",
            `${
                message ||
                `${winner.name} (Kills: ${kills}) killed ${loser.name} (Kills: ${loserKills})`
            } (Server: ${this.serverName})`
        );

        if (!message) return;

        if (process.env.NODE_ENV.trim() === "production") {
            this.rcon.say(message);
            this.sendMessage(message);
        }
    }
}
