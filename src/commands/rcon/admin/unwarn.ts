import { sendWebhookMessage } from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

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
        const ingamePlayer = await ctx.rcon.getIngamePlayer(name);
        const player = this.bot.cachedPlayers.get(ingamePlayer?.id) || {
            server: ctx.rcon.options.name,
            ...(await LookupPlayer(ingamePlayer?.id)),
        };

        if (!player?.id) {
            return await ctx.say("Invalid player provided");
        }

        const playerWarns = await this.bot.database.Warns.findOne({
            id: player.id,
        });

        if (!playerWarns || playerWarns.infractions === 0)
            return `${player.name} (${outputPlayerIDs(
                player.ids,
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
            `${removeMentions(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) unwarned ${removeMentions(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) (Warnings: ${playerWarns.infractions - 1})`
        );
    }
}
