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
import { hastebin } from "../../../utils";
import logger from "../../../utils/logger";

export default class Rcon extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "rcon",
            description: "Run RCON command",
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
                    name: "command",
                    description: "RCON Command to run",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: {
                [config.discord.guildId]: [
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
        const options = {
            server: ctx.options.server as string,
            command: ctx.options.command as string,
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
            return (await ctx.send(`Not connected to RCON`)) as Message;
        }

        try {
            let res: string | string[] = await server.rcon.send(
                `${options.command}`
            );
            res = res.split("\n").map((line) => line.trim());
            // if (res[res.length - 1] === "\u0000") res.pop();

            logger.info(
                "Command",
                `${ctx.member.displayName}#${ctx.member.user.discriminator} used RCON command (Command: ${options.command})`
            );

            const response = res.join("\n");

            await ctx.send(
                {
                    embeds: [
                        {
                            description: [
                                `RCON ran command (${options.command})\n`,
                                response.length > 2047
                                    ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                                          response
                                      )})`
                                    : response,
                            ].join("\n"),
                        },
                    ],
                },
                { ephemeral: true }
            );
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
