"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class Ban extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Ban a player",
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
                {
                    name: "duration",
                    description: "Duration of the ban in minutes",
                    required: true,
                    type: slash_create_1.CommandOptionType.INTEGER,
                },
                {
                    name: "reason",
                    description: "Reason of the ban",
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    hasPermission(ctx) {
        return ctx.member.roles.some((r) => Config_1.default.get("discord.roles")
            .filter((role) => role.commands.includes(this.commandName))
            .find((role) => role.Ids.includes(r)));
    }
    async run(ctx) {
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
        const duration = options.duration;
        const reason = options.reason;
        try {
            if (Config_1.default.get("syncServerPunishments")) {
                const result = await this.bot.rcon.globalBan({
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                }, player, duration, reason, options.server);
                const failedServers = result.filter((result) => result.data.failed);
                const allServersFailed = this.bot.servers.size === failedServers.length;
                await ctx.send({
                    embeds: [
                        {
                            description: [
                                `${allServersFailed ? "Tried to ban" : "Banned"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
                                `Duration: ${options.duration.isEqualTo(0)
                                    ? "PERMANENT"
                                    : pluralize_1.default("minute", options.duration.toNumber(), true)}`,
                                `Reason: ${reason || "None given"}\n`,
                            ].join("\n"),
                            ...(failedServers.length && {
                                fields: [
                                    {
                                        name: "Failed servers",
                                        value: failedServers
                                            .map((server) => `${server.name} (${server.data.result})`)
                                            .join("\n"),
                                    },
                                ],
                            }),
                        },
                    ],
                });
            }
            else {
                const error = await server.rcon.banUser(options.server, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                }, player, duration, reason);
                if (error) {
                    return (await ctx.send(error));
                }
                await ctx.send({
                    embeds: [
                        {
                            description: [
                                `Banned player ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
                                `Server: ${server.name}`,
                                `Duration: ${options.duration.isEqualTo(0)
                                    ? "PERMANENT"
                                    : pluralize_1.default("minute", options.duration.toNumber(), true)}`,
                                `Reason: ${reason}`,
                            ].join("\n"),
                        },
                    ],
                });
            }
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} banned ${player.name} (${player.id}) (Duration: ${duration}, Reason: ${reason})`);
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Ban;
