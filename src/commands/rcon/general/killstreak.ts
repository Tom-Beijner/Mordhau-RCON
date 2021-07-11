import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class Killstreak extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "killstreak [player name/id]",
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.rcon.options.killstreaks.enabled) return;

        let player: {
            ids?: { playFabID: string; steamID?: string };
            id: any;
            name?: any;
        };

        if (ctx.args.length) {
            const name = ctx.args.join(" ");

            player = await ctx.rcon.getIngamePlayer(name);
            if (!player) return;
        } else player = ctx.player;

        const kills = ctx.rcon.killStreak.getKillstreak(player.id);

        await ctx.say(`${player.name} has a killstreak of ${kills}!`);
    }
}
