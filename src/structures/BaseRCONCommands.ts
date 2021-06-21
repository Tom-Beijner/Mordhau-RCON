import { Option } from "dashdash";
import RCONCommandContext from "./RCONCommandContext";
import Watchdog from "./Watchdog";

// https://github.com/Tromodolo/Kurisu

interface MetaData {
    name: string;
    usage: string;
    aliases?: string[];
    adminsOnly?: boolean;
    options?: Option[];
}

/**
 * Class definition for a command object
 *
 * @class Command
 * @prop {CommandMetadata} meta Command Metadata
 * @prop {function} run Command function that runs when the command gets triggered
 */
export default abstract class BaseRCONCommand {
    public bot: Watchdog;
    public meta: MetaData = {
        name: "",
        usage: "",
        aliases: [],
        adminsOnly: false,
        options: [],
    };

    constructor(bot: Watchdog, meta: MetaData) {
        this.bot = bot;
        this.meta = { ...this.meta, ...meta };
    }

    /**
     * @arg {Message} message The message sent
     * @arg {string[]} args Array of all the args sent with the command
     * @returns {Promise<any>} Return a promise of any kind
     */
    public abstract execute(ctx: RCONCommandContext): Promise<any>;
}
