import { sendWebhookMessage } from "../../../services/Discord";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class Unwarn extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "unwarn <player name/id>",
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

        const name = ctx.args.join(" ");

        const player = await ctx.rcon.getIngamePlayer(name);
        if (!player) return await ctx.say("Player not found");
        const cachedPlayer = ctx.bot.cachedPlayers.get(player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(player.id)),
        };

        const playerWarns = await this.bot.database.Warns.findOne({
            id: cachedPlayer.id,
        });

        if (!playerWarns || playerWarns.infractions === 0)
            return `${player.name} (${outputPlayerIDs(
                cachedPlayer.ids,
                true
            )}) has not been warned`;

        await this.bot.database.Warns.updateOne(
            { id: player.id },
            {
                $inc: { infractions: -1 },
            }
        );

        sendWebhookMessage(
            ctx.rcon.webhooks.get("warns"),
            `${admin.name} (${outputPlayerIDs(admin.ids, true)}) unwarned ${
                cachedPlayer.name
            } (${outputPlayerIDs(cachedPlayer.ids, true)}) (Warnings: ${
                playerWarns.infractions - 1
            })`
        );
    }
}
