"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const date_fns_1 = require("date-fns");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pluralize_1 = __importDefault(require("pluralize"));
const Discord_1 = require("../services/Discord");
const PlayFab_1 = require("../services/PlayFab");
const Config_1 = __importDefault(require("../structures/Config"));
const Hastebin_1 = require("../utils/Hastebin");
const logger_1 = __importDefault(require("../utils/logger"));
const PlayerID_1 = require("../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../utils/RemoveMentions"));
class BasePunishment {
    constructor(bot, type) {
        this.bot = bot;
        this.type = type;
    }
    async _handler(server, date, player, admin, duration, reason, global) {
        const fetchedPlayer = ((player === null || player === void 0 ? void 0 : player.name) ? player : null) ||
            this.bot.cachedPlayers.get(player.id) ||
            (await PlayFab_1.LookupPlayer(player.id));
        if (global) {
            this.savePayload({
                player: fetchedPlayer,
                server,
                date,
                duration,
                reason,
                admin,
                global,
            });
            return;
        }
        return this.handler(server, date, fetchedPlayer, admin, duration, reason);
    }
    async savePayload(payload) {
        const type = `${payload.global && this.type !== "KICK" ? "GLOBAL " : ""}${this.type}`;
        const duration = new bignumber_js_1.default(payload.duration);
        logger_1.default.info("Bot", `${payload.admin.name} (${PlayerID_1.outputPlayerIDs(payload.admin.ids)}) ${type.toLowerCase().replace("global", "globally")}${["BAN", "UNBAN", "GLOBAL BAN", "GLOBAL UNBAN"].includes(type)
            ? "ned"
            : type === "KICK"
                ? "ed"
                : "d"} ${payload.player.name} (${PlayerID_1.outputPlayerIDs(payload.player.ids)})${!duration.isNaN()
            ? duration.isEqualTo(0)
                ? " PERMANENTLY"
                : ` for ${pluralize_1.default("minute", duration.toNumber(), true)}`
            : ""}${payload.reason &&
            payload.reason.length &&
            payload.reason !== "None given"
            ? ` with the reason: ${payload.reason}`
            : ""}`);
        const server = Config_1.default
            .get("servers")
            .find((server) => server.name === payload.server);
        if (["KICK", "BAN", "GLOBAL BAN"].includes(type))
            this.bot.punishedPlayers.set(payload.player.id, {
                punishment: type,
                admin: payload.admin,
            });
        const playerHistory = await this.bot.database.getPlayerHistory([
            payload.player.ids.playFabID,
            payload.player.ids.steamID,
        ]);
        let playeravatar;
        if (playerHistory.ids.steamID) {
            await node_fetch_1.default(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${Config_1.default.get("steam.key")}&steamids=${playerHistory.ids.steamID}`)
                .then(async (res) => {
                const json = await res.json();
                if (!payload.player.name)
                    payload.player.name =
                        json["response"]["players"][0]["personaname"];
                playeravatar = json["response"]["players"][0]["avatarfull"];
            })
                .catch(() => {
            });
        }
        const playFabID = payload.player.ids.playFabID || playerHistory.ids.playFabID;
        const steamID = payload.player.ids.steamID || playerHistory.ids.steamID;
        this.sendMessage({
            ...payload,
            player: {
                ids: {
                    playFabID,
                    steamID,
                },
                id: playFabID,
                name: payload.player.name,
            },
            playeravatar,
            type,
            history: playerHistory.history,
            previousNames: playerHistory.previousNames,
        });
        const punishments = server === null || server === void 0 ? void 0 : server.rcon.punishments;
        if ((!payload.global &&
            punishments &&
            (!punishments.shouldSave ||
                !punishments.types[`${this.type.toLocaleLowerCase()}s`])) ||
            process.env.NODE_ENV.trim() !== "production")
            return;
        this.bot.database.updatePlayerHistory({
            ids: [
                {
                    platform: "PlayFab",
                    id: playFabID,
                },
                {
                    platform: "Steam",
                    id: steamID,
                },
            ],
            type,
            player: payload.player.name,
            server: payload.server,
            id: payload.player.id,
            date: new Date(payload.date).getTime(),
            admin: `${payload.admin.name} (${payload.admin.id})`,
            reason: payload.reason,
            duration: duration,
        });
    }
    async sendMessage(data) {
        var _a, _b, _c, _d, _e, _f, _g;
        let duration = !((_a = data.duration) === null || _a === void 0 ? void 0 : _a.isEqualTo(0)) && ((_b = data.duration) === null || _b === void 0 ? void 0 : _b.toString());
        if ((_c = data.duration) === null || _c === void 0 ? void 0 : _c.isEqualTo(0)) {
            duration = "PERMANENT";
            if (["BAN", "GLOBAL BAN"].includes(data.type)) {
                const server = this.bot.servers.get(data.server);
                const payload = `${RemoveMentions_1.default(data.player.name)} (${PlayerID_1.outputPlayerIDs(data.player.ids, true)}) ${data.global ? "globally" : `in ${data.server}`}`;
                if (server) {
                    Discord_1.sendWebhookMessage(server.rcon.webhooks.get("permanent"), payload);
                }
                else {
                    for (const [serverName, server] of this.bot.servers) {
                        Discord_1.sendWebhookMessage(server.rcon.webhooks.get("permanent"), payload);
                    }
                }
            }
        }
        else
            duration += ` ${pluralize_1.default("minute", (_d = data.duration) === null || _d === void 0 ? void 0 : _d.toNumber())}`;
        let pastOffenses;
        let totalDuration = data.duration || new bignumber_js_1.default(0);
        if (!data.history.length)
            pastOffenses = "None";
        else {
            pastOffenses = "------------------";
            for (let i = 0; i < data.history.length; i++) {
                const offenses = [];
                const h = data.history[i];
                const type = h.type;
                const admin = h.admin;
                const date = new Date(h.date);
                let historyDuration;
                if (!h.duration || h.duration.isEqualTo(0))
                    historyDuration = "PERMANENT";
                else {
                    historyDuration = pluralize_1.default("minute", h.duration.toNumber(), true);
                    totalDuration = totalDuration.plus(h.duration);
                }
                offenses.push([
                    `\nID: ${h._id}`,
                    `Type: ${type}`,
                    type.includes("GLOBAL")
                        ? undefined
                        : `Server: ${h.server}`,
                    `Platform: ${PlayerID_1.parsePlayerID(h.id).platform}`,
                    `Date: ${date.toDateString()} (${date_fns_1.formatDistanceToNow(date, { addSuffix: true })})`,
                    `Admin: ${admin}`,
                    `Offense: ${h.reason || "None given"}`,
                    ["BAN", "MUTE", "GLOBAL BAN", "GLOBAL MUTE"].includes(type)
                        ? `Duration: ${historyDuration} ${((_e = h.duration) === null || _e === void 0 ? void 0 : _e.isEqualTo(0))
                            ? ""
                            : `(Un${["BAN", "GLOBAL BAN"].includes(type)
                                ? "banned"
                                : "muted"} ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(date, h.duration.toNumber()), { addSuffix: true })})`}`
                        : undefined,
                    `------------------`,
                ]
                    .filter((line) => typeof line !== "undefined")
                    .join("\n"));
                pastOffenses += offenses.join("\n");
            }
            if (pastOffenses.length < 1025)
                pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
        }
        if (pastOffenses.length > 1024)
            pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await Hastebin_1.hastebin(pastOffenses)})`;
        logger_1.default.info("Bot", `Sending ${data.type.toLowerCase()} to punishments webhook`);
        let message = [
            data.global ? undefined : `**Server**: \`${data.server}\``,
            `**Admin**: \`${data.admin.name} (${data.admin.id})\``,
        ].filter((line) => typeof line !== "undefined");
        let color;
        if (["BAN", "GLOBAL BAN"].includes(data.type)) {
            message.push(`**Offense**: \`${data.reason || "None given"}\``, `**Duration**: \`${duration}${((_f = data.duration) === null || _f === void 0 ? void 0 : _f.isEqualTo(0))
                ? ""
                : ` (Unbanned ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(new Date(), new bignumber_js_1.default(data.duration).toNumber()), { addSuffix: true })})`}\``);
            color = data.type === "BAN" ? 15158332 : 10038562;
        }
        if (["MUTE", "GLOBAL MUTE"].includes(data.type)) {
            message.push(`**Duration**: \`${duration} ${((_g = data.duration) === null || _g === void 0 ? void 0 : _g.isEqualTo(0))
                ? ""
                : `(Unmuted ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(new Date(), new bignumber_js_1.default(data.duration).toNumber()), { addSuffix: true })})`}\``);
            color = data.type === "MUTE" ? 3447003 : 2123412;
        }
        if (["UNMUTE", "GLOBAL UNMUTE"].includes(data.type)) {
            color = data.type === "UNMUTE" ? 7506394 : 4675208;
        }
        if (data.type === "KICK") {
            message.push(`**Offense**: \`${data.reason || "None given"}\``);
            color = 3426654;
        }
        if (["UNBAN", "GLOBAL UNBAN"].includes(data.type)) {
            color = data.type === "UNBAN" ? 3066993 : 2067276;
        }
        const server = this.bot.servers.get(data.server);
        const payload = {
            title: `${data.type} REPORT`,
            description: message.join("\n"),
            fields: [
                {
                    name: "Player",
                    value: [
                        `**Name**: \`${data.player.name}\``,
                        `**PlayFabID**: \`${data.player.ids.playFabID}\``,
                        `**SteamID**: [${data.player.ids.steamID}](<http://steamcommunity.com/profiles/${data.player.ids.steamID}>)`,
                        `**Previous Names**: \`${data.previousNames.length
                            ? data.previousNames
                            : "None"}\``,
                        `**Total Duration**: \`${pluralize_1.default("minute", totalDuration.toNumber(), true)}\``,
                    ].join("\n"),
                },
                {
                    name: `Previous Offenses (${data.history.length})`,
                    value: pastOffenses,
                },
            ],
            color,
            image: {
                url: data.playeravatar,
            },
            timestamp: new Date(data.date).toISOString(),
        };
        if (server) {
            Discord_1.sendWebhookEmbed(server.rcon.webhooks.get("punishments"), payload);
        }
        else {
            for (const [serverName, server] of this.bot.servers) {
                Discord_1.sendWebhookEmbed(server.rcon.webhooks.get("punishments"), payload);
            }
        }
        logger_1.default.debug("Bot", "Message sent.");
    }
    execute(server, date, player, admin, duration, reason, global) {
        return this._handler(server, date.getTime(), player, admin, duration, reason, global);
    }
}
exports.default = BasePunishment;
