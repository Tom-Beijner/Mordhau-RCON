import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";

export default class Ping extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Show the bot's ping",
        });
    }

    async run(ctx: CommandContext) {
        const startedAt = Date.now();
        await ctx.send(":ping_pong: Calculating ping");

        await ctx.editOriginal(
            `:ping_pong: Pong!\nMessage: \`${Date.now() - startedAt}ms\``
        );
    }
}
