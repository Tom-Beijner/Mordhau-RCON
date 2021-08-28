import { sendWebhookMessage } from "../../../services/Discord";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

export default class RequestAdmin extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "requestadmins",
            aliases: ["requestadmins", "reqadmins", "reqadmin", "admincall"],
        });
    }

    async execute(ctx: RCONCommandContext) {
        const player = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };

        sendWebhookMessage(
            ctx.rcon.webhooks.get("adminCalls"),
            `${removeMentions(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) requested admins${
                ctx.args.length
                    ? ` with the message \`${ctx.args.join(" ")}\``
                    : ""
            } (Server: ${player.server})`
        );

        await ctx.say("Requested admins");
    }
}
