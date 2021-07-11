import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class Unban extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "unban <player id>",
            adminsOnly: true,
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");

        const admin = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };

        const id = ctx.args.join(" ");

        const cachedPlayer = ctx.bot.cachedPlayers.get(id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(id)),
        };

        if (!cachedPlayer) return await ctx.say("Player not found");

        const error = await ctx.rcon.unbanUser(
            ctx.rcon.options.name,
            admin,
            cachedPlayer
        );
        if (error) await ctx.say(error);
    }
}
