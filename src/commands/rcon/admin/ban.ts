import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class Ban extends BaseRCONCommand {
    constructor(bot: Watchdog) {
        super(bot, {
            name: "ban",
            usage: "ban <player name/id> [--duration positiveInteger] [--reason string]",
            adminsOnly: true,
            options: [
                {
                    names: ["duration", "d"],
                    type: "positiveInteger",
                    help: "Duration of the ban",
                    default: "0",
                },
                {
                    names: ["reason", "r"],
                    type: "string",
                    help: "Reason of the ban",
                },
            ],
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");

        const admin = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };

        const name = ctx.args.join(" ");

        const player = await ctx.rcon.getIngamePlayer(name);
        if (!player) return await ctx.say("Player not found");
        const cachedPlayer = ctx.bot.cachedPlayers.get(player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(player.id)),
        };

        const duration = ctx.opts.duration;
        const reason = ctx.opts.reason;

        const error = await ctx.rcon.banUser(
            ctx.rcon.options.name,
            admin,
            cachedPlayer,
            duration,
            reason
        );
        if (error) await ctx.say(error);
    }
}
