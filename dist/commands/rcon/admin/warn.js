"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const pluralize_1 = __importDefault(require("pluralize"));
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
const Config_1 = __importDefault(require("../../../structures/Config"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../../../utils/RemoveMentions"));
class Warn extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "warn <player name/id>",
            adminsOnly: true,
        });
    }
    async execute(ctx) {
        var _a;
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");
        const admin = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };
        const name = ctx.args.join(" ");
        const ingamePlayer = await ctx.rcon.getIngamePlayer(name);
        const player = this.bot.cachedPlayers.get(ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || {
            server: ctx.rcon.options.name,
            ...(await PlayFab_1.LookupPlayer(ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id)),
        };
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.say("Invalid player provided");
        }
        const playerWarns = await this.bot.database.Warns.findOneAndUpdate({ id: player.id }, {
            $inc: { infractions: 1 },
            $set: {
                expirationDate: new Date(Date.now() +
                    parseInt(Config_1.default.get("warns.resetAfterDuration")) *
                        60 *
                        1000),
            },
        }, { new: true, upsert: true });
        const infractionThresholds = Config_1.default.get("warns.infractionThresholds");
        const highestInfractionThreshold = parseInt(Object.keys(infractionThresholds).reduce((a, b) => parseInt(a) > parseInt(b) ? a : b));
        const infractionIteration = playerWarns.infractions / highestInfractionThreshold;
        function onlyDecimals(value) {
            value = Math.abs(value);
            return Number((value - Math.floor(value)).toFixed(3));
        }
        function compareDecimals(first, second) {
            return onlyDecimals(first) === onlyDecimals(second);
        }
        for (const infractionsThreshhold in Config_1.default.get("warns.infractionThresholds")) {
            if (compareDecimals(parseInt(infractionsThreshhold) /
                highestInfractionThreshold, infractionIteration)) {
                const punishment = Config_1.default.get(`warns.infractionThresholds.${infractionsThreshhold}`);
                const server = (_a = this.bot.cachedPlayers.get(player.id)) === null || _a === void 0 ? void 0 : _a.server;
                const message = punishment.message
                    .replace(/{name}/g, player.name)
                    .replace(/{currentWarns}/g, playerWarns.infractions.toString())
                    .replace(/{maxWarns}/g, Object.keys(Config_1.default.get("warns.infractionThresholds")).length.toString());
                const reason = punishment.reason;
                const duration = new bignumber_js_1.default(infractionIteration > 1
                    ? punishment.duration * Math.ceil(infractionIteration)
                    : punishment.duration);
                switch (punishment.type) {
                    case "message": {
                        await ctx.say(`${message}`);
                        break;
                    }
                    case "mute": {
                        const error = await ctx.rcon.muteUser(server, admin, player, duration);
                        if (error) {
                            logger_1.default.error("Warn", `Error occurred while muting ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await ctx.say(message);
                        }
                        break;
                    }
                    case "kick": {
                        const error = await ctx.rcon.kickUser(server, admin, player, reason);
                        if (error) {
                            logger_1.default.error("Warn", `Error occurred while kicking ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await ctx.say(message);
                        }
                        break;
                    }
                    case "ban": {
                        const error = await ctx.rcon.banUser(server, admin, player, duration, reason);
                        if (error) {
                            logger_1.default.error("Warn", `Error occurred while banning ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await ctx.say(message);
                        }
                        break;
                    }
                    case "globalmute": {
                        const result = await this.bot.rcon.globalMute(admin, player, duration);
                        const failedServers = result.filter((result) => result.data.failed);
                        if (failedServers.length) {
                            logger_1.default.error("Warn", `Error occurred while globally muting ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (Failed to mute on ${pluralize_1.default("server", failedServers.length)}: ${failedServers
                                .map((server) => `${server.name} (${server.data.result})`)
                                .join(", ")})`);
                        }
                        else {
                            await ctx.say(message);
                        }
                        break;
                    }
                    case "globalban": {
                        const result = await this.bot.rcon.globalBan(admin, player, duration, reason);
                        const failedServers = result.filter((result) => result.data.failed);
                        if (failedServers.length) {
                            logger_1.default.error("Warn", `Error occurred while globally banning ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (Failed to ban on ${pluralize_1.default("server", failedServers.length)}: ${failedServers
                                .map((server) => `${server.name} (${server.data.result})`)
                                .join(", ")})`);
                        }
                        else {
                            await ctx.say(message);
                        }
                        break;
                    }
                }
                Discord_1.sendWebhookMessage(ctx.rcon.webhooks.get("warns"), `${punishment.type === "globalban"
                    ? "Globally ban"
                    : punishment.type === "globalmute"
                        ? "Globally mute"
                        : punishment.type[0].toUpperCase() +
                            punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                    ? "ned"
                    : ["warn", "kick"].includes(punishment.type)
                        ? "ed"
                        : "d"} ${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) for reaching warn threshold (Server: ${ctx.rcon.options.name}, Admin: ${RemoveMentions_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)})${duration
                    ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                    : ""}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`);
                logger_1.default.info("Warn", `${punishment.type === "globalban"
                    ? "Globally ban"
                    : punishment.type === "globalmute"
                        ? "Globally mute"
                        : punishment.type[0].toUpperCase() +
                            punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                    ? "ned"
                    : ["warn", "kick"].includes(punishment.type)
                        ? "ed"
                        : "d"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) for reaching warn threshold (Server: ${ctx.rcon.options.name}, Admin: ${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)})${duration
                    ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                    : ""}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`);
                if (Config_1.default.get("warns.infiniteDurationScaling"))
                    return;
                if (parseInt(infractionsThreshhold) >=
                    highestInfractionThreshold) {
                    await this.bot.database.Warns.deleteOne({
                        id: player.id,
                    });
                    logger_1.default.info("Warn", `Reset ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) infractions`);
                }
            }
        }
    }
}
exports.default = Warn;
