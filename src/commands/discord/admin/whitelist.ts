import flatMap from "array.prototype.flatmap";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    ComponentType,
    Message,
    SlashCreator,
    TextInputStyle,
} from "slash-create";
import { ComponentConfirmation } from "../../../services/Discord";
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
                    ],
                },
                {
                    type: CommandOptionType.SUB_COMMAND,
                    name: "clear",
                    description: "Clear the whitelist",
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
        const options = ctx.options[ctx.subcommands[0]] as {
            server: string;
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
                await ctx.defer();

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
                await ctx.defer();

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
                await ctx.defer();

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
                await ctx.sendModal(
                    {
                        title: "Add players to the whitelist",
                        components: [
                            {
                                type: ComponentType.ACTION_ROW,
                                components: [
                                    {
                                        type: ComponentType.TEXT_INPUT,
                                        label: "PlayFab IDs (one per line)",
                                        style: TextInputStyle.PARAGRAPH,
                                        custom_id: "playFabIDs",
                                        placeholder: "ID1\nID2\n...",
                                    },
                                ],
                            },
                        ],
                    },
                    async (mctx) => {
                        const values = mctx.values as {
                            playFabIDs: string;
                        };

                        const ids = [
                            ...new Set(
                                values.playFabIDs
                                    .split("\n")
                                    .filter((id) => id.length)
                                    .map((id) => id.trim())
                            ),
                        ];

                        if (ids.length === 0) {
                            return (await mctx.send(
                                "No valid PlayFab IDs provided"
                            )) as Message;
                        }

                        if (ids.length > 100) {
                            return (await mctx.send(
                                "Too many PlayFab IDs provided (max 100)"
                            )) as Message;
                        }

                        const added: { id: string; name: string }[] = [];
                        const alreadyExisting: { id: string; name: string }[] =
                            [];
                        const invalid: string[] = [];

                        for (let i = 0; i < ids.length; i++) {
                            const id = ids[i];

                            const ingamePlayer =
                                await server.rcon.getIngamePlayer(id);
                            const player = this.bot.cachedPlayers.get(
                                ingamePlayer?.id || id
                            ) || {
                                server: server.name,
                                ...(await LookupPlayer(ingamePlayer?.id || id)),
                            };

                            if (!player?.id) {
                                invalid.push(id);
                                continue;
                            }

                            const existing = this.bot.whitelist.add(
                                server.rcon,
                                {
                                    ids: {
                                        playFabID: ctx.member.id,
                                    },
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

                            if (existing) {
                                alreadyExisting.push({
                                    id: player.id,
                                    name: player.name,
                                });
                                continue;
                            }

                            added.push({ id: player.id, name: player.name });
                        }

                        const message = [
                            added.length
                                ? `Added (${added.length} ${pluralize(
                                      "players",
                                      added.length
                                  )}): ${added
                                      .map(
                                          (player) =>
                                              `${player.name} (${player.id})`
                                      )
                                      .join(", ")}`
                                : null,
                            alreadyExisting.length
                                ? `Already Exists (${
                                      alreadyExisting.length
                                  } ${pluralize(
                                      "players",
                                      alreadyExisting.length
                                  )}): ${alreadyExisting
                                      .map(
                                          (player) =>
                                              `${player.name} (${player.id})`
                                      )
                                      .join(", ")}`
                                : null,
                            invalid.length
                                ? `Invalid (${invalid.length} ${pluralize(
                                      "IDs",
                                      invalid.length
                                  )}): ${invalid.join(", ")}`
                                : null,
                        ]
                            .filter((message) => message !== null)
                            .join("\n");

                        return await mctx.send({
                            content:
                                message.length > 1023
                                    ? `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                                          message
                                      )})`
                                    : message,
                        });
                    }
                );
                break;
            }
            case "remove": {
                await ctx.sendModal(
                    {
                        title: "Remove players to the whitelist",
                        components: [
                            {
                                type: ComponentType.ACTION_ROW,
                                components: [
                                    {
                                        type: ComponentType.TEXT_INPUT,
                                        label: "PlayFab IDs (one per line)",
                                        style: TextInputStyle.PARAGRAPH,
                                        custom_id: "playFabIDs",
                                        placeholder: "ID1\nID2\n...",
                                    },
                                ],
                            },
                        ],
                    },
                    async (mctx) => {
                        const values = mctx.values as {
                            playFabIDs: string;
                        };

                        const ids = [
                            ...new Set(
                                values.playFabIDs
                                    .split("\n")
                                    .filter((id) => id.length)
                                    .map((id) => id.trim())
                            ),
                        ];

                        if (ids.length === 0) {
                            return (await mctx.send(
                                "No valid PlayFab IDs provided"
                            )) as Message;
                        }

                        if (ids.length > 100) {
                            return (await mctx.send(
                                "Too many PlayFab IDs provided (max 100)"
                            )) as Message;
                        }

                        const removed: { id: string; name: string }[] = [];
                        const doesntExisting: { id: string; name: string }[] =
                            [];
                        const invalid: string[] = [];

                        for (let i = 0; i < ids.length; i++) {
                            const id = ids[i];

                            const ingamePlayer =
                                await server.rcon.getIngamePlayer(id);
                            const player = this.bot.cachedPlayers.get(
                                ingamePlayer?.id || id
                            ) || {
                                server: server.name,
                                ...(await LookupPlayer(ingamePlayer?.id || id)),
                            };

                            if (!player?.id) {
                                invalid.push(id);
                                continue;
                            }

                            const existing = this.bot.whitelist.remove(
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

                            if (existing) {
                                doesntExisting.push({
                                    id: player.id,
                                    name: player.name,
                                });
                                continue;
                            }

                            removed.push({ id: player.id, name: player.name });
                        }

                        const message = [
                            removed.length
                                ? `Removed (${removed.length} ${pluralize(
                                      "players",
                                      removed.length
                                  )}): ${removed
                                      .map(
                                          (player) =>
                                              `${player.name} (${player.id})`
                                      )
                                      .join(", ")}`
                                : null,
                            doesntExisting.length
                                ? `Doesn't exist (${
                                      doesntExisting.length
                                  } ${pluralize(
                                      "players",
                                      doesntExisting.length
                                  )}): ${doesntExisting
                                      .map(
                                          (player) =>
                                              `${player.name} (${player.id})`
                                      )
                                      .join(", ")}`
                                : null,
                            invalid.length
                                ? `Invalid (${invalid.length} ${pluralize(
                                      "IDs",
                                      invalid.length
                                  )}): ${invalid.join(", ")}`
                                : null,
                        ]
                            .filter((message) => message !== null)
                            .join("\n");

                        return await mctx.send({
                            content:
                                message.length > 1023
                                    ? `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                                          message
                                      )})`
                                    : message,
                        });
                    }
                );
                break;
            }
            case "clear": {
                await ctx.defer();

                await ComponentConfirmation(
                    ctx,
                    {
                        embeds: [
                            {
                                description: [
                                    `Are you sure you want to clear the whitelist on ${server.name}?`,
                                ].join("\n"),
                                color: 15158332,
                            },
                        ],
                    },
                    async (btnCtx) => {
                        if (ctx.user.id !== btnCtx.user.id) return;

                        const existing = await this.bot.whitelist.clear(
                            server.rcon,
                            {
                                ids: { playFabID: ctx.member.id },
                                id: ctx.member.id,
                                name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                            }
                        );

                        if (existing) {
                            return await ctx.send(existing);
                        }

                        await btnCtx.editParent({
                            content: `Cleared the whitelist on ${server.name}`,
                            embeds: [],
                            components: [],
                        });
                    }
                );
                break;
            }
        }
    }
}
