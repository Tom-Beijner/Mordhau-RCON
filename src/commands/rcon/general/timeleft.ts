import { addSeconds, formatDistanceToNow } from "date-fns";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";

export default class Timeleft extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "timeleft",
        });
    }

    async execute(ctx: RCONCommandContext) {
        const leftMatchDuration = await ctx.rcon.getLeftMatchDuration();

        await ctx.say(
            `Match ends ${formatDistanceToNow(
                addSeconds(new Date(), leftMatchDuration),
                { addSuffix: true }
            )}`
        );
    }
}
