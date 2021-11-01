"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../../../utils/RemoveMentions"));
class Unwarn extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Unwarn a player",
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
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            server: ctx.options.server,
            player: ctx.options.player,
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
        const ingamePlayer = await server.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) || {
            server: server.name,
            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player)),
        };
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.send("Invalid player provided");
        }
        try {
            const playerWarns = await this.bot.database.Warns.findOne({
                id: player.id,
            });
            if (!playerWarns || playerWarns.infractions === 0)
                return `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has not been warned`;
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: [
                            `Are you sure you want to unwarn ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})?\n`,
                            `Warnings: ${playerWarns.infractions}`,
                        ].join("\n"),
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id)
                    return;
                await this.bot.database.Warns.updateOne({ id: player.id }, {
                    $inc: { infractions: -1 },
                });
                Discord_1.sendWebhookMessage(server.rcon.webhooks.get("warns"), `${ctx.member.displayName}#${ctx.member.user.discriminator} (${ctx.member.id}) unwarned ${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) (Warnings: ${playerWarns.infractions - 1})`);
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} unwarned ${player.name} (${player.id}) (Server: ${server.rcon.options.name}, Warnings: ${playerWarns.infractions - 1})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: [
                                `Unwarned ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)})\n`,
                                `Warnings: ${playerWarns.infractions - 1}`,
                            ].join("\n"),
                        },
                    ],
                    components: [],
                });
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Unwarn;
