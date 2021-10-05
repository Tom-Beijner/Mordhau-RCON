import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class CancelMapVote extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "cancelmapvote",
            adminsOnly: true,
        });
    }

    async execute(ctx: RCONCommandContext) {
        ctx.rcon.mapVote.cancel();
    }
}
