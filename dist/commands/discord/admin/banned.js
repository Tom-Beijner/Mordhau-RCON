"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const PlayerID_1 = require("../../../utils/PlayerID");
class Banned extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Check if a player is banned and the duration",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    hasPermission(ctx) {
        return ctx.member.roles.some((r) => Config_1.default.get("discord.roles")
            .filter((role) => role.commands.includes(this.commandName))
            .find((role) => role.Ids.includes(r)));
    }
    async run(ctx) {
        await ctx.defer();
        try {
            const id = ctx.options.player;
            const servers = await this.bot.rcon.getBannedPlayer(id);
            const fields = [];
            const player = this.bot.cachedPlayers.get(id) || (await PlayFab_1.LookupPlayer(id));
            if (!(player === null || player === void 0 ? void 0 : player.id)) {
                return await ctx.send("Invalid player provided");
            }
            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];
                fields.push({
                    name: server.server,
                    value: !server.data
                        ? "Player not banned"
                        : `Duration: ${server.data.duration.isEqualTo(0)
                            ? "Permanent"
                            : pluralize_1.default("minute", server.data.duration.toNumber(), true)}`,
                });
            }
            if (!fields.length) {
                return await ctx.send(`${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) is not banned`);
            }
            await ctx.send({
                embeds: [
                    {
                        description: [
                            `**Banned Player:**`,
                            `Name: ${player.name}`,
                            `PlayFabID: ${player.ids.playFabID}`,
                            `SteamID: ${player.ids.steamID}`,
                        ].join("\n"),
                        fields,
                    },
                ],
            });
        }
        catch (error) {
            await ctx.send(`An error occured while performing the command (${error.message || error})`);
        }
    }
}
exports.default = Banned;
