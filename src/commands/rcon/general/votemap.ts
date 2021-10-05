import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class VoteMap extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "votemap [map number]",
        });
    }

    async execute(ctx: RCONCommandContext) {
        ctx.rcon.mapVote.vote(parseInt(ctx.args[0]), ctx.player);
    }
}
