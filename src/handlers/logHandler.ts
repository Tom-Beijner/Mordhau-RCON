import Watchdog from "../structures/Watchdog";
import BanHandler from "./banHandler";
import KickHandler from "./kickHandler";
import MuteHandler from "./muteHandler";
import UnbanHandler from "./unbanHandler";
import UnmuteHandler from "./unmuteHandler";

export default class LogHandler {
    bot: Watchdog;
    banHandler: BanHandler;
    unbanHandler: UnbanHandler;
    kickHandler: KickHandler;
    muteHandler: MuteHandler;
    unmuteHandler: UnmuteHandler;

    constructor(bot: Watchdog) {
        this.bot = bot;
        this.banHandler = new BanHandler(bot);
        this.unbanHandler = new UnbanHandler(bot);
        this.kickHandler = new KickHandler(bot);
        this.muteHandler = new MuteHandler(bot);
        this.unmuteHandler = new UnmuteHandler(bot);
    }
}
