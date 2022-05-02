"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class GlobalUnmute extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Globally unmute a player",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
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
            player: ctx.options.player,
        };
        const ingamePlayer = await this.bot.rcon.getIngamePlayer(ctx.options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) ||
            (await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player));
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.send("Invalid player provided");
        }
        try {
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: `Are you sure you want to globally unmute ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})?\n\n`,
                    },
                ],
            }, async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id)
                    return;
                const result = await this.bot.rcon.globalUnmute({
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                }, player);
                const failedServers = result.filter((result) => result.data.failed);
                const allServersFailed = this.bot.servers.size === failedServers.length;
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator}${allServersFailed ? " tried to" : ""} globally ${allServersFailed ? "unmute" : "unmuted"} ${player.name} (${player.id})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: [
                                `${allServersFailed ? "Tried to g" : "G"}lobally ${allServersFailed ? "unmute" : "unmuted"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})\n`,
                            ].join("\n"),
                            ...(failedServers.length && {
                                fields: [
                                    {
                                        name: "Failed servers",
                                        value: failedServers
                                            .map((server) => `${server.name} (${server.data.result})`)
                                            .join("\n"),
                                    },
                                ],
                            }),
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
exports.default = GlobalUnmute;
