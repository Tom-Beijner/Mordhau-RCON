"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../../../utils/RemoveMentions"));
class Warn extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Warn a player",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                    choices: Config_1.default.get("servers").map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    async run(ctx) {
        var _a;
        await ctx.defer();
        const options = {
            server: ctx.options.server,
            player: ctx.options.player,
            duration: new bignumber_js_1.default(ctx.options.duration),
            reason: ctx.options.reason,
        };
        const server = this.bot.servers.get(options.server);
        if (!server) {
            return (await ctx.send(`Server not found, existing servers are: ${[
                ...this.bot.servers.keys(),
            ].join(", ")}`));
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(`Not ${!server.rcon.connected ? "connected" : "authenticated"} to server`));
        }
        const ingamePlayer = await server.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) || {
            server: server.name,
            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player)),
        };
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.send("Invalid player provided");
        }
        try {
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
            for (const infractionsThreshhold in infractionThresholds) {
                if (compareDecimals(parseInt(infractionsThreshhold) /
                    highestInfractionThreshold, infractionIteration)) {
                    const admin = {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    };
                    const punishment = Config_1.default.get(`warns.infractionThresholds.${infractionsThreshhold}`);
                    const serverName = (_a = this.bot.cachedPlayers.get(player.id)) === null || _a === void 0 ? void 0 : _a.server;
                    const message = punishment.message
                        .replace(/{name}/g, player.name)
                        .replace(/{currentWarns}/g, playerWarns.infractions.toString())
                        .replace(/{maxWarns}/g, highestInfractionThreshold.toString());
                    const reason = punishment.reason;
                    const duration = new bignumber_js_1.default(infractionIteration > 1
                        ? punishment.duration *
                            Math.ceil(infractionIteration)
                        : punishment.duration);
                    switch (punishment.type) {
                        case "message": {
                            await server.rcon.say(`${message}`);
                            break;
                        }
                        case "mute": {
                            const error = await server.rcon.muteUser(serverName, admin, player, duration);
                            if (error) {
                                logger_1.default.error("Warn", `Error occurred while muting ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                            }
                            else {
                                await server.rcon.say(message);
                            }
                            break;
                        }
                        case "kick": {
                            const error = await server.rcon.kickUser(serverName, admin, player, reason);
                            if (error) {
                                logger_1.default.error("Warn", `Error occurred while kicking ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                            }
                            else {
                                await server.rcon.say(message);
                            }
                            break;
                        }
                        case "ban": {
                            const error = await server.rcon.banUser(serverName, admin, player, duration, reason);
                            if (error) {
                                logger_1.default.error("Warn", `Error occurred while banning ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                            }
                            else {
                                await server.rcon.say(message);
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
                                await server.rcon.say(message);
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
                                await server.rcon.say(message);
                            }
                            break;
                        }
                    }
                    Discord_1.sendWebhookMessage(server.rcon.webhooks.get("warns"), `${punishment.type === "globalban"
                        ? "Globally ban"
                        : punishment.type === "globalmute"
                            ? "Globally mute"
                            : punishment.type[0].toUpperCase() +
                                punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                        ? "ned"
                        : ["warn", "kick"].includes(punishment.type)
                            ? "ed"
                            : "d"} ${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) for reaching warn threshold (Server: ${server.rcon.options.name}, Admin: ${ctx.member.displayName}#${ctx.member.user.discriminator} (${ctx.member.id})${duration
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
                            : "d"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) for reaching warn threshold (Server: ${server.rcon.options.name}, Admin: ${ctx.member.displayName}#${ctx.member.user.discriminator} (${ctx.member.id})${duration
                        ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                        : ""}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`);
                    logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} warned ${player.name} (${player.id}) (Server: ${server.rcon.options.name}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`);
                    await ctx.send({
                        embeds: [
                            {
                                description: `${punishment.type === "globalban"
                                    ? "Globally ban"
                                    : punishment.type === "globalmute"
                                        ? "Globally mute"
                                        : punishment.type[0].toUpperCase() +
                                            punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                                    ? "ned"
                                    : ["warn", "kick"].includes(punishment.type)
                                        ? "ed"
                                        : "d"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) for reaching warn threshold (Server: ${server.rcon.options.name}, Admin: ${ctx.member.displayName}#${ctx.member.user.discriminator} (${ctx.member.id})${duration
                                    ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                                    : ""}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`,
                            },
                        ],
                    });
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
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Warn;
