import flatMap from "array.prototype.flatmap";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils/Hastebin";
import logger from "../../../utils/logger";

export default class Chatlog extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get latest server chatlog",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.get("servers").map((server) => ({
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
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
            permissions: Object.assign(
                {},
                ...bot.client.guilds.map((guild) => ({
                    [guild.id]: flatMap(
                        (config.get("discord.roles") as Role[]).filter((role) =>
                            role.commands.includes(commandName)
                        ),
                        (role) =>
                            role.Ids.map((id) => ({
                                type: ApplicationCommandPermissionType.ROLE,
                                id,
                                permission: true,
                            }))
                    ),
                }))
            ),
        });
    }

    hasPermission(ctx: CommandContext): string | boolean {
        // const permissions = Object.assign(
        //     {},
        //     ...this.bot.client.guilds.map((guild) => ({
        //         [guild.id]: flatMap(
        //             (config.get("discord.roles") as Role[]).filter((role) =>
        //                 role.commands.includes(this.commandName)
        //             ),
        //             (role) =>
        //                 role.Ids.map((id) => ({
        //                     type: ApplicationCommandPermissionType.ROLE,
        //                     id,
        //                     permission: true,
        //                 }))
        //         ),
        //     }))
        // );

        // return (
        //     permissions[ctx.guildID]?.some((permission) =>
        //         ctx.member.roles.includes(permission.id)
        //     ) ?? false
        // );

        return ctx.member.roles.some((r) =>
            (config.get("discord.roles") as Role[])
                .filter((role) => role.commands.includes(this.commandName))
                .find((role) => role.Ids.includes(r))
        );
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            server: ctx.options.server as string,
            messages: ctx.options.messages as number,
        };

        const server = this.bot.servers.get(options.server);
        if (!server) {
            return (await ctx.send(
                `Server not found, existing servers are: ${[
                    ...this.bot.servers.keys(),
                ].join(", ")}`
            )) as Message;
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(
                `Not ${
                    !server.rcon.connected ? "connected" : "authenticated"
                } to server`
            )) as Message;
        }

        if (options.messages < 0) {
            return (await ctx.send(
                "Must retrive at least 1 message"
            )) as Message;
        }
        if (options.messages > 50) {
            return (await ctx.send(
                "Must retrive less than 51 messages"
            )) as Message;
        }

        try {
            options.messages += 1;
            let res: string | string[] = await server.rcon.send(
                `chatlog ${options.messages}`
            );
            // console.log("res", `unban ${player.id}`, res);
            res = res.split("\n").map((line) => line.trim());
            // res.pop();

            options.messages -= 1;

            logger.info(
                "Command",
                `${ctx.member.nick || ctx.member.user.username}#${
                    ctx.member.user.discriminator
                } fetched chat log (${pluralize(
                    "message",
                    options.messages,
                    true
                )})`
            );

            const response = res.join("\n") || "No messages found";

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Fetched latest chatlog (${pluralize(
                                "message",
                                options.messages,
                                true
                            )})\n`,
                            response.length > 2047
                                ? `The output was too long, but was uploaded to [paste.gg](${await hastebin(
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
