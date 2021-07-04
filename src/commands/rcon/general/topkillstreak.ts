import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class TopKillstreak extends BaseRCONCommand {
    constructor(bot: Watchdog) {
        super(bot, {
            name: "topkillstreak",
            aliases: ["highestkillstreak"],
            usage: "topkillstreak [player name/id]",
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.rcon.options.killstreaks.enabled) return;

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
