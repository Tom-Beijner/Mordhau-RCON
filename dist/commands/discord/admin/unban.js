"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class Unban extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Unban a player",
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
        await ctx.defer();
        const options = {
            player: ctx.options.player,
            server: ctx.options.server,
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
            if (Config_1.default.get("syncServerPunishments")) {
                const result = await this.bot.rcon.globalUnban({
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                }, player, options.server);
                const failedServers = result.filter((result) => result.data.failed);
                const allServersFailed = this.bot.servers.size === failedServers.length;
                await ctx.send({
                    embeds: [
                        {
                            description: [
                                `${allServersFailed
                                    ? "Tried to unban"
                                    : "Unbanned"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
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
                const error = await server.rcon.unbanUser(player.server, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                }, player);
                if (error) {
                    return (await ctx.send(error));
                }
                await ctx.send({
                    embeds: [
                        {
                            description: [
                                `Unbanned player ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
                                `Server: ${server.name}`,
                            ].join("\n"),
                        },
                    ],
                });
            }
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} unbanned ${player.name} (${player.id})`);
        }
        catch (error) {
            await ctx.send(`An error occured while performing the command (${error.message || error})`);
        }
    }
}
exports.default = Unban;
