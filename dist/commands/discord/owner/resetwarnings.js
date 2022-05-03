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
const parseOut_1 = __importDefault(require("../../../utils/parseOut"));
const PlayerID_1 = require("../../../utils/PlayerID");
class ResetWarnings extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Reset a player's warnings",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
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
        await ctx.defer();
        const options = {
            player: ctx.options.player,
        };
        const ingamePlayer = await this.bot.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) ||
            (await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player));
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
                            `Are you sure you want to reset warnings of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})?\n`,
                            `Warnings: ${playerWarns.infractions}`,
                        ].join("\n"),
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id)
                    return;
                await this.bot.database.Warns.deleteOne({ id: player.id });
                for (const [serverName, server] of this.bot.servers) {
                    Discord_1.sendWebhookMessage(server.rcon.webhooks.get("warns"), `${ctx.member.displayName}#${ctx.member.user.discriminator} (${ctx.member.id}) reset ${parseOut_1.default(player.name)}'s (${PlayerID_1.outputPlayerIDs(player.ids, true)}) warnings (Previous warnings: ${playerWarns.infractions - 1})`);
                }
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} reset ${player.name}'s (${player.id}) warnings (Previous warnings: ${playerWarns.infractions - 1})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: [
                                `Reset ${player.name}'s (${PlayerID_1.outputPlayerIDs(player.ids)}) warnings\n`,
                                `Previous warnings: ${playerWarns.infractions - 1}`,
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
exports.default = ResetWarnings;
