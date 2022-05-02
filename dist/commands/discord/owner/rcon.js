"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const utils_1 = require("../../../utils");
const logger_1 = __importDefault(require("../../../utils/logger"));
class Rcon extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Run RCON command",
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
                    name: "command",
                    description: "RCON Command to run",
                    required: true,
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
            command: ctx.options.command,
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
        try {
            let res = await server.rcon.send(`${options.command}`);
            res = res.split("\n").map((line) => line.trim());
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} used RCON command (Command: ${options.command})`);
            const response = res.join("\n");
            await ctx.send({
                embeds: [
                    {
                        title: `RCON - ${options.command}`,
                        description: `\`\`\`${response.length > 2047
                            ? `The output was too long, but was uploaded to [paste.gg](${await utils_1.hastebin(response)})`
                            : response}\`\`\``,
                    },
                ],
            }, { ephemeral: true });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Rcon;
