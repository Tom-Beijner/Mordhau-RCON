import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils/Hastebin";
import logger from "../../../utils/logger";

export default class Chatlog extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "chatlog",
            description: "Get latest server chatlog",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.servers.map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "messages",
                    description: "Amount of messages to return",
                    required: true,
                    type: CommandOptionType.INTEGER,
                },
            ],
            defaultPermission: false,
            permissions: {
                [config.discord.guildId]: [
                    ...config.discord.roles.mods.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.admins.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.headAdmin.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.owner.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                ],
            },
        });
    }

    async run(ctx: CommandContext) {
        const server = this.bot.servers.get(ctx.options.server as string);
        if (!server) {
            return (await ctx.send(
                `Server not found, existing servers are: ${[
                    ...this.bot.servers.keys(),
                ].join(", ")}`
            )) as Message;
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(`Not connected to RCON`)) as Message;
        }

        let messages = ctx.options.messages as number;
        if (messages < 0) {
            return (await ctx.send(
                "Must retrive at least 1 message"
            )) as Message;
        }
        if (messages > 50) {
            return (await ctx.send(
                "Must retrive less than 51 messages"
            )) as Message;
        }

        try {
            messages += 1;
            let res: string | string[] = await server.rcon.send(
                `chatlog ${messages}`
            );
            // console.log("res", `unban ${player.id}`, res);
            res = res.split("\n").map((line) => line.trim());
            // res.pop();

            messages -= 1;

            logger.info(
                "Command",
                `${ctx.member.nick || ctx.member.user.username}#${
                    ctx.member.user.discriminator
                } fetched chat log (${pluralize("message", messages, true)})`
            );

            const response = res.join("\n") || "No messages found";

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Fetched latest chatlog (${pluralize(
                                "message",
                                messages,
                                true
                            )})\n`,
                            response.length > 2047
                                ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                                      response
                                  )})`
                                : response,
                        ].join("\n"),
                    },
                ],
            });
        } catch (error) {
            await ctx.send(
                `An error occured while performing the command (${
                    error.message || error
                })`
            );
        }
    }
}
