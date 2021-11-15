"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const PlayFab_1 = require("../../../services/PlayFab");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class Mute extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "mute <player name/id> [--duration positiveInteger]",
            adminsOnly: true,
            options: [
                {
                    names: ["duration", "d"],
                    type: "positiveInteger",
                    help: "Duration of the mute",
                },
            ],
        });
    }
    async execute(ctx) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");
        if (!ctx.opts.duration) {
            return await ctx.say("Provide a duration");
        }
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
        const duration = new bignumber_js_1.default(ctx.opts.duration);
        const error = await ctx.rcon.muteUser(ctx.rcon.options.name, admin, player, duration);
        if (error)
            await ctx.say(error);
    }
}
exports.default = Mute;
