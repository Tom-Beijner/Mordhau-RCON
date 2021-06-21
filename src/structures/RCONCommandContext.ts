import dashdash from "dashdash";
import logger from "../utils/logger";
import BaseRCONCommand from "./BaseRCONCommands";
import Rcon from "./Rcon";
import Watchdog from "./Watchdog";

export default class RCONCommandContext {
    public bot: Watchdog;
    public rcon: Rcon;
    public player: {
        ids: { playFabID: string; steamID?: string };
        id: string;
        name?: string;
    };
    public message: string;
    public args: string[];
    public opts?: dashdash.Results;

    constructor(
        command: BaseRCONCommand,
        bot: Watchdog,
        rcon: Rcon,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        message: string,
        args: string[]
    ) {
        this.bot = bot;
        this.rcon = rcon;
        this.player = player;
        this.message = message;

        if (!command.meta?.options.length) {
            this.args = args;
            return;
        }

        try {
            const parsed = dashdash.parse({
                argv: ["argv", "args", ...args],
                options: command.meta?.options,
            });
            this.opts = parsed;
            this.args = parsed._args;
        } catch (err) {
            logger.error(
                "RCON Context",
                `Error occurred while parsing args (${err.message || err})`
            );
        }
    }

    say(content: string) {
        return this.rcon.say(content);
    }
}
