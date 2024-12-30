"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class Chatlog extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get latest server chatlog",
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
                    name: "messages",
                    description: "Amount of messages to return",
                    required: true,
                    type: slash_create_1.CommandOptionType.INTEGER,
                },
            ],
            dmPermission: false,
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
            messages: ctx.options.messages,
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
        if (options.messages < 0) {
            return (await ctx.send("Must retrive at least 1 message"));
        }
        if (options.messages > 50) {
            return (await ctx.send("Must retrive less than 51 messages"));
        }
        try {
            options.messages += 1;
            let res = await server.rcon.send(`chatlog ${options.messages}`);
            res = res.split("\n").map((line) => line.trim());
            options.messages -= 1;
            logger_1.default.info("Command", `${ctx.member.nick || ctx.member.user.username}#${ctx.member.user.discriminator} fetched chat log (${pluralize_1.default("message", options.messages, true)})`);
            const response = res.join("\n") || "No messages found";
            let attachment;
            if (response.length > 2047) {
                attachment = Buffer.from(response);
            }
            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Fetched latest chatlog (${pluralize_1.default("message", options.messages, true)})\n`,
                            response.length > 2047
                                ? "See attached text file"
                                : response,
                        ].join("\n"),
                    },
                ],
                ...(response.length > 2047 && {
                    file: {
                        file: attachment,
                        name: "Output.txt"
                    }
                })
            });
        }
        catch (error) {
            await ctx.send(`An error occured while performing the command (${error.message || error})`);
        }
    }
}
exports.default = Chatlog;
