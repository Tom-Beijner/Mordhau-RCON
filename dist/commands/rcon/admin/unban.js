"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PlayFab_1 = require("../../../services/PlayFab");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class Unban extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "unban <player id>",
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
        const id = ctx.args.join(" ");
        const player = ctx.bot.cachedPlayers.get(id) || {
            server: ctx.rcon.options.name,
            ...(await PlayFab_1.LookupPlayer(id)),
        };
        if (!player)
            return await ctx.say("Player not found");
        const error = await ctx.rcon.unbanUser(ctx.rcon.options.name, admin, player);
        if (error)
            await ctx.say(error);
    }
}
exports.default = Unban;
