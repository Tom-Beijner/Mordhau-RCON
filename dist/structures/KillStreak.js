"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Discord_1 = require("../services/Discord");
const Config_1 = __importDefault(require("../structures/Config"));
const logger_1 = __importDefault(require("../utils/logger"));
const parseOut_1 = __importDefault(require("../utils/parseOut"));
class KillStreak {
    constructor(rcon, serverName) {
        this.cache = {
            players: new Map(),
            highestKillstreak: null,
            canFirstBlood: false,
        };
        this.rcon = rcon;
        this.serverName = serverName;
    }
    sendMessage(message) {
        return Discord_1.sendWebhookMessage(this.rcon.webhooks.get("killstreak"), `${parseOut_1.default(message)} (Server: ${this.serverName})`);
    }
    getKillstreak(id) {
        return (this.cache.players.get(id) || { kills: 0 }).kills;
    }
    removeKillstreak(player, killedBy) {
        const kills = this.getKillstreak(player.id);
        if (kills >= 5) {
            let message = "";
            if (killedBy)
                message = `${killedBy.name} ended ${player.name}'s killstreak of ${kills}!`;
            else
                message = `${player.name} ended their own killstreak of ${kills}!`;
            logger_1.default.debug("Killstreak", `${message} (Server: ${this.serverName})`);
            if (process.env.NODE_ENV.trim() === "production") {
                this.rcon.say(message);
                this.sendMessage(message);
            }
        }
        this.cache.players.delete(player.id);
        return kills;
    }
    clear() {
        this.cache.canFirstBlood = true;
        this.cache.highestKillstreak = null;
        this.cache.players.clear();
    }
    async check(winner, loser) {
        if (!this.rcon.options.killstreaks.countBotKills && (!winner || !loser))
            return;
        let kills = this.getKillstreak(winner.id) + 1;
        this.cache.players.set(winner.id, {
            ...(this.cache.players.get(winner.id) || {
                player: { id: winner.id, name: winner.name },
            }),
            kills,
        });
        if (!this.cache.highestKillstreak ||
            this.cache.highestKillstreak.kills < kills)
            this.cache.highestKillstreak = { player: winner, kills };
        const loserKills = this.removeKillstreak(loser, winner);
        let message = "";
        if (kills === 1) {
            if (!this.cache.canFirstBlood)
                return;
            this.cache.canFirstBlood = false;
            message =
                Config_1.default.get("killstreakMessages.1") ||
                    `${winner.name} got first blood!`;
        }
        else {
            for (const killsThreshhold in Config_1.default.get("killstreakMessages")) {
                if (parseInt(killsThreshhold) === kills) {
                    message = Config_1.default.get(`killstreakMessages.${killsThreshhold}`);
                    break;
                }
            }
        }
        message = message
            .replace(/{name}/g, winner.name)
            .replace(/{kills}/g, kills.toString());
        logger_1.default.debug("Killstreak", `${message ||
            `${winner.name} (Kills: ${kills}) killed ${loser.name} (Kills: ${loserKills})`} (Server: ${this.serverName})`);
        if (!message)
            return;
        if (process.env.NODE_ENV.trim() === "production") {
            this.rcon.say(message);
            this.sendMessage(message);
        }
    }
}
exports.default = KillStreak;
