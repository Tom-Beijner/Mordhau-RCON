import flatMap from "array.prototype.flatmap";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import { LookupPlayer } from "../../../services/PlayFab";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils/Hastebin";
import logger from "../../../utils/logger";

export default class Whitelist extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Whitelist commands",
            options: [
                // {
                //     name: "server",
                //     description: "Server to run the command on",
                //     required: true,
                //     type: CommandOptionType.STRING,
                //     choices: config.get("servers").map((server) => ({
                //         name: server.name,
                //         value: server.name,
                //     })),
                // },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "on",
                    description: "Enable the whitelist",
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
                    ],
                },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "off",
                    description: "Disable the whitelist",
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
                    ],
                },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "list",
                    description: "List the whitelisted players",
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
                    ],
                },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "add",
                    description: "Add a player to the whitelist",
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
                            name: "player",
                            description: "PlayFab ID or name of the player",
                            required: true,
                            type: CommandOptionType.STRING,
                        },
                    ],
                },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "remove",
                    description: "Remove a player from the whitelist",
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
                            name: "player",
                            description: "PlayFab ID or name of the player",
                            required: true,
                            type: CommandOptionType.STRING,
                        },
                    ],
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
        const options = ctx.options[ctx.subcommands[0]] as {
            server: string;
            player: string;
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

        switch (ctx.subcommands[0]) {
            case "on": {
                this.bot.whitelist.on(server.rcon, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                });

                return (await ctx.send(
                    `Whitelist enabled on ${server.name}`
                )) as Message;
            }
            case "off": {
                this.bot.whitelist.off(server.rcon, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                });

                return (await ctx.send(
                    `Whitelist disabled on ${server.name}`
                )) as Message;
            }
            case "list": {
                const players = await this.bot.whitelist.list(server.rcon);

                return (await ctx.send(
                    `Whitelisted players on ${server.name}: ${
                        players.length
                            ? players.map((player) => player.id).join(", ")
                            : "none"
                    }`
                )) as Message;
            }
            case "add": {
                const ingamePlayer = await server.rcon.getIngamePlayer(
                    options.player
                );
                const player = this.bot.cachedPlayers.get(
                    ingamePlayer?.id || options.player
                ) || {
                    server: server.name,
                    ...(await LookupPlayer(ingamePlayer?.id || options.player)),
                };

                if (!player?.id) {
                    return await ctx.send("Invalid player provided");
                }

                this.bot.whitelist.add(
                    server.rcon,
                    {
                        ids: {
                            playFabID: player.ids.playFabID,
                            steamID: player.ids.steamID,
                        },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    },
                    {
                        ids: { playFabID: player.id },
                        id: player.id,
                        name: player.name,
                    }
                );

                return (await ctx.send(
                    `Added ${player.name} to the whitelist on ${server.name}`
                )) as Message;
            }
            case "remove": {
                const ingamePlayer = await server.rcon.getIngamePlayer(
                    options.player
                );
                const player = this.bot.cachedPlayers.get(
                    ingamePlayer?.id || options.player
                ) || {
                    server: server.name,
                    ...(await LookupPlayer(ingamePlayer?.id || options.player)),
                };

                if (!player?.id) {
                    return await ctx.send("Invalid player provided");
                }

                this.bot.whitelist.remove(
                    server.rcon,
                    {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    },
                    {
                        ids: {
                            playFabID: player.ids.playFabID,
                            steamID: player.ids.steamID,
                        },
                        id: player.id,
                        name: player.name,
                    }
                );

                return (await ctx.send(
                    `Removed ${player.name} from the whitelist on ${server.name}`
                )) as Message;
            }
        }
    }
}
