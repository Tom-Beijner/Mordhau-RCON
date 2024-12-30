import flatMap from "array.prototype.flatmap";
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
import logger from "../../../utils/logger";

export default class Rcon extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Run RCON command",
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
                    name: "command",
                    description: "RCON Command to run",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            requiredPermissions: [],
            // permissions: Object.assign(
            //     {},
            //     ...bot.client.guilds.map((guild) => ({
            //         [guild.id]: flatMap(
            //             (config.get("discord.roles") as Role[]).filter((role) =>
            //                 role.commands.includes(commandName)
            //             ),
            //             (role) =>
            //                 role.Ids.map((id) => ({
            //                     type: ApplicationCommandPermissionType.ROLE,
            //                     id,
            //                     permission: true,
            //                 }))
            //         ),
            //     }))
            // ),
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
            return (await ctx.send(
                `Not ${!server.rcon.connected ? "connected" : "authenticated"
                } to server`
            )) as Message;
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

            let attachment: Buffer
            if (response.length > 2047) {
                attachment = Buffer.from(
                    response
                )
            }

            await ctx.send(
                {
                    embeds: [
                        {
                            title: `RCON - ${options.command}`,
                            description: `\`\`\`${response.length > 2047
                                ? "See attached text file"
                                : response
                                }\`\`\``,
                        },
                    ],
                    ...(response.length > 2047 && {
                        file: {
                            file: attachment,
                            name: "Output.txt"
                        }
                    })
                },
                { ephemeral: true }
            );
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error
                    })`,
            });
        }
    }
}
