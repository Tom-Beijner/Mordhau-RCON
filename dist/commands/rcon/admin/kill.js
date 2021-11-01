"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PlayFab_1 = require("../../../services/PlayFab");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class Kill extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "kill <player name/id>",
            adminsOnly: true,
        });
    }
    async execute(ctx) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");
        const name = ctx.args.join(" ");
        const ingamePlayer = await ctx.rcon.getIngamePlayer(name);
        const player = this.bot.cachedPlayers.get(ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || {
            server: ctx.rcon.options.name,
            ...(await PlayFab_1.LookupPlayer(ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id)),
        };
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.say("Invalid player provided");
        }
        await ctx.rcon.send(`killplayer ${player.id}`);
        await ctx.say(`${player.name} was killed by lightning!`);
    }
}
exports.default = Kill;
