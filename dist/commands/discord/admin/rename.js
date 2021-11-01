"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const slash_create_1 = require("slash-create");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class Rename extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Rename a in game player's name",
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
                    name: "new_name",
                    description: "A new name for the player",
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
        const server = this.bot.servers.get(ctx.options.server);
        if (!server) {
            return (await ctx.send(`Server not found, existing servers are: ${[
                ...this.bot.servers.keys(),
            ].join(", ")}`));
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(`Not ${!server.rcon.connected ? "connected" : "authenticated"} to server`));
        }
        const player = await this.bot.rcon.getIngamePlayer(ctx.options.player);
        if (!player) {
            return (await ctx.send("Player is not in the server"));
        }
        const newName = ctx.options.new_name;
        try {
            await server.rcon.send(`renameplayer ${player.id} ${newName}`);
            logger_1.default.info("Command", `${ctx.member.nick || ctx.member.user.username}#${ctx.member.user.discriminator} renamed player ${player.name} (${player.id}) to ${newName} (Server: ${server.name})`);
            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Server: ${server.name}`,
                            `Renamed player ${player.name} (${player.id})\n`,
                            `To: ${newName}`,
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
exports.default = Rename;
