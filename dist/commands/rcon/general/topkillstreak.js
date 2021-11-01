"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class TopKillstreak extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            aliases: ["highestkillstreak"],
            usage: "topkillstreak [player name/id]",
        });
    }
    async execute(ctx) {
        if (!ctx.rcon.options.killstreaks.enabled)
            return;
        const highestKillstreak = ctx.rcon.killStreak.cache.highestKillstreak;
        let message = "";
        if (!highestKillstreak)
            message = "No one has any kills, what a sad gamer moment.";
        else {
            message = `${highestKillstreak.player.name} has the highest killstreak of ${highestKillstreak.kills}!`;
        }
        await ctx.say(message);
    }
}
exports.default = TopKillstreak;
