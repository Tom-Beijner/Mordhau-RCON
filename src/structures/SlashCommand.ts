import {
    SlashCommand as Command,
    SlashCommandOptions,
    SlashCreator,
} from "slash-create";
import Watchdog from "./Watchdog";

export default abstract class SlashCommand extends Command {
    bot: Watchdog;

    constructor(
        creator: SlashCreator,
        bot: Watchdog,
        opts: SlashCommandOptions
    ) {
        super(creator, opts);
        this.bot = bot;
    }
}
