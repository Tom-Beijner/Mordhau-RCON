import { LookupPlayer } from "../../../services/PlayFab";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class Kill extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "kill <player name/id>",
            adminsOnly: true,
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");

        const name = ctx.args.join(" ");
        const ingamePlayer = await ctx.rcon.getIngamePlayer(name);
        const player = this.bot.cachedPlayers.get(ingamePlayer?.id) || {
            server: ctx.rcon.options.name,
            ...(await LookupPlayer(ingamePlayer?.id)),
        };

        if (!player?.id) {
            return await ctx.say("Invalid player provided");
        }

        await ctx.rcon.send(`kill ${player.id}`);
        await ctx.say(`${player.name} was killed by lightning!`);
    }
}
