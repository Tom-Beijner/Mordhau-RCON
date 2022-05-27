"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const Hastebin_1 = require("../../../utils/Hastebin");
class Whitelist extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Whitelist commands",
            options: [
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "on",
                    description: "Enable the whitelist",
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
                    ],
                },
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "off",
                    description: "Disable the whitelist",
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
                    ],
                },
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "list",
                    description: "List the whitelisted players",
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
                    ],
                },
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "add",
                    description: "Add a player to the whitelist",
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
                    ],
                },
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "remove",
                    description: "Remove a player from the whitelist",
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
                    ],
                },
                {
                    type: slash_create_1.CommandOptionType.SUB_COMMAND,
                    name: "clear",
                    description: "Clear the whitelist",
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
                    ],
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
        const options = ctx.options[ctx.subcommands[0]];
        const server = this.bot.servers.get(options.server);
        if (!server) {
            return (await ctx.send(`Server not found, existing servers are: ${[
                ...this.bot.servers.keys(),
            ].join(", ")}`));
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(`Not ${!server.rcon.connected ? "connected" : "authenticated"} to server`));
        }
        switch (ctx.subcommands[0]) {
            case "on": {
                await ctx.defer();
                this.bot.whitelist.on(server.rcon, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                });
                return (await ctx.send(`Whitelist enabled on ${server.name}`));
            }
            case "off": {
                await ctx.defer();
                this.bot.whitelist.off(server.rcon, {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                });
                return (await ctx.send(`Whitelist disabled on ${server.name}`));
            }
            case "list": {
                await ctx.defer();
                const players = await this.bot.whitelist.list(server.rcon);
                return (await ctx.send(`Whitelisted players on ${server.name}: ${players.length
                    ? players.map((player) => player.id).join(", ")
                    : "none"}`));
            }
            case "add": {
                await ctx.sendModal({
                    title: "Add players to the whitelist",
                    components: [
                        {
                            type: slash_create_1.ComponentType.ACTION_ROW,
                            components: [
                                {
                                    type: slash_create_1.ComponentType.TEXT_INPUT,
                                    label: "PlayFab IDs (one per line)",
                                    style: slash_create_1.TextInputStyle.PARAGRAPH,
                                    custom_id: "playFabIDs",
                                    placeholder: "ID1\nID2\n...",
                                },
                            ],
                        },
                    ],
                }, async (mctx) => {
                    const values = mctx.values;
                    const ids = [
                        ...new Set(values.playFabIDs
                            .split("\n")
                            .filter((id) => id.length)
                            .map((id) => id.trim())),
                    ];
                    if (ids.length === 0) {
                        return (await mctx.send("No valid PlayFab IDs provided"));
                    }
                    if (ids.length > 100) {
                        return (await mctx.send("Too many PlayFab IDs provided (max 100)"));
                    }
                    const added = [];
                    const alreadyExisting = [];
                    const invalid = [];
                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];
                        const ingamePlayer = await server.rcon.getIngamePlayer(id);
                        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || id) || {
                            server: server.name,
                            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || id)),
                        };
                        if (!(player === null || player === void 0 ? void 0 : player.id)) {
                            invalid.push(id);
                            continue;
                        }
                        const existing = this.bot.whitelist.add(server.rcon, {
                            ids: {
                                playFabID: ctx.member.id,
                            },
                            id: ctx.member.id,
                            name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                        }, {
                            ids: {
                                playFabID: player.ids.playFabID,
                                steamID: player.ids.steamID,
                            },
                            id: player.id,
                            name: player.name,
                        });
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
                            ? `Added (${added.length} ${pluralize_1.default("players", added.length)}): ${added
                                .map((player) => `${player.name} (${player.id})`)
                                .join(", ")}`
                            : null,
                        alreadyExisting.length
                            ? `Already Exists (${alreadyExisting.length} ${pluralize_1.default("players", alreadyExisting.length)}): ${alreadyExisting
                                .map((player) => `${player.name} (${player.id})`)
                                .join(", ")}`
                            : null,
                        invalid.length
                            ? `Invalid (${invalid.length} ${pluralize_1.default("IDs", invalid.length)}): ${invalid.join(", ")}`
                            : null,
                    ]
                        .filter((message) => message !== null)
                        .join("\n");
                    return await mctx.send({
                        content: message.length > 1023
                            ? `The output was too long, but was uploaded to [paste.gg](${await Hastebin_1.hastebin(message)})`
                            : message,
                    });
                });
                break;
            }
            case "remove": {
                await ctx.sendModal({
                    title: "Remove players to the whitelist",
                    components: [
                        {
                            type: slash_create_1.ComponentType.ACTION_ROW,
                            components: [
                                {
                                    type: slash_create_1.ComponentType.TEXT_INPUT,
                                    label: "PlayFab IDs (one per line)",
                                    style: slash_create_1.TextInputStyle.PARAGRAPH,
                                    custom_id: "playFabIDs",
                                    placeholder: "ID1\nID2\n...",
                                },
                            ],
                        },
                    ],
                }, async (mctx) => {
                    const values = mctx.values;
                    const ids = [
                        ...new Set(values.playFabIDs
                            .split("\n")
                            .filter((id) => id.length)
                            .map((id) => id.trim())),
                    ];
                    if (ids.length === 0) {
                        return (await mctx.send("No valid PlayFab IDs provided"));
                    }
                    if (ids.length > 100) {
                        return (await mctx.send("Too many PlayFab IDs provided (max 100)"));
                    }
                    const removed = [];
                    const doesntExisting = [];
                    const invalid = [];
                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];
                        const ingamePlayer = await server.rcon.getIngamePlayer(id);
                        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || id) || {
                            server: server.name,
                            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || id)),
                        };
                        if (!(player === null || player === void 0 ? void 0 : player.id)) {
                            invalid.push(id);
                            continue;
                        }
                        const existing = this.bot.whitelist.remove(server.rcon, {
                            ids: { playFabID: ctx.member.id },
                            id: ctx.member.id,
                            name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                        }, {
                            ids: {
                                playFabID: player.ids.playFabID,
                                steamID: player.ids.steamID,
                            },
                            id: player.id,
                            name: player.name,
                        });
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
                            ? `Removed (${removed.length} ${pluralize_1.default("players", removed.length)}): ${removed
                                .map((player) => `${player.name} (${player.id})`)
                                .join(", ")}`
                            : null,
                        doesntExisting.length
                            ? `Doesn't exist (${doesntExisting.length} ${pluralize_1.default("players", doesntExisting.length)}): ${doesntExisting
                                .map((player) => `${player.name} (${player.id})`)
                                .join(", ")}`
                            : null,
                        invalid.length
                            ? `Invalid (${invalid.length} ${pluralize_1.default("IDs", invalid.length)}): ${invalid.join(", ")}`
                            : null,
                    ]
                        .filter((message) => message !== null)
                        .join("\n");
                    return await mctx.send({
                        content: message.length > 1023
                            ? `The output was too long, but was uploaded to [paste.gg](${await Hastebin_1.hastebin(message)})`
                            : message,
                    });
                });
                break;
            }
            case "clear": {
                await ctx.defer();
                await Discord_1.ComponentConfirmation(ctx, {
                    embeds: [
                        {
                            description: [
                                `Are you sure you want to clear the whitelist on ${server.name}?`,
                            ].join("\n"),
                            color: 15158332,
                        },
                    ],
                }, async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id)
                        return;
                    const existing = await this.bot.whitelist.clear(server.rcon, {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    });
                    if (existing) {
                        return await ctx.send(existing);
                    }
                    await btnCtx.editParent({
                        content: `Cleared the whitelist on ${server.name}`,
                        embeds: [],
                        components: [],
                    });
                });
                break;
            }
        }
    }
}
exports.default = Whitelist;
