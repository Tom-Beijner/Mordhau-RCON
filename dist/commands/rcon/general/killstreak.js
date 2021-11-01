"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class Killstreak extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "killstreak [player name/id]",
        });
    }
    async execute(ctx) {
        if (!ctx.rcon.options.killstreaks.enabled)
            return;
        let player;
        if (ctx.args.length) {
            const name = ctx.args.join(" ");
            player = await ctx.rcon.getIngamePlayer(name);
            if (!player)
                return;
        }
        else
            player = ctx.player;
        const kills = ctx.rcon.killStreak.getKillstreak(player.id);
        await ctx.say(`${player.name} has a killstreak of ${kills}!`);
    }
}
exports.default = Killstreak;
