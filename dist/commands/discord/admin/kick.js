"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class Kick extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Kick a player",
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
                    name: "reason",
                    description: "Reason of the kick",
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
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
        if (!(ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id)) {
            return await ctx.send("Invalid player provided");
        }
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) || {
            server: server.name,
            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player)),
        };
        const reason = options.reason;
        try {
            const error = await server.rcon.kickUser(player.server, {
                ids: { playFabID: ctx.member.id },
                id: ctx.member.id,
                name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
            }, player, reason);
            if (error) {
                return (await ctx.send(error));
            }
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} kicked ${player.name} (${player.id}) (Reason: ${reason})`);
            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Kicked player ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
                            `Server: ${server.name}`,
                            `Reason: ${reason}`,
                        ].join("\n"),
                    },
                ],
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Kick;
