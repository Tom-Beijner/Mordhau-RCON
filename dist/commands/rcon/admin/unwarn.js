"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
const parseOut_1 = __importDefault(require("../../../utils/parseOut"));
const PlayerID_1 = require("../../../utils/PlayerID");
class Unwarn extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "unwarn <player name/id>",
            adminsOnly: true,
        });
    }
    async execute(ctx) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");
        const admin = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };
        const name = ctx.args.join(" ");
        const ingamePlayer = await ctx.rcon.getIngamePlayer(name);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || name) || {
            server: ctx.rcon.options.name,
            ...(await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || name)),
        };
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.say("Invalid player provided");
        }
        const playerWarns = await this.bot.database.Warns.findOne({
            id: player.id,
        });
        if (!playerWarns || playerWarns.infractions === 0)
            return `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has not been warned`;
        await this.bot.database.Warns.updateOne({ id: player.id }, {
            $inc: { infractions: -1 },
        });
        Discord_1.sendWebhookMessage(ctx.rcon.webhooks.get("warns"), `${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) unwarned ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) (Warnings: ${playerWarns.infractions - 1})`);
    }
}
exports.default = Unwarn;
