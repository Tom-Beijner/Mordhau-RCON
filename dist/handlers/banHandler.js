"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BasePunishment_1 = __importDefault(require("../structures/BasePunishment"));
const logger_1 = __importDefault(require("../utils/logger"));
const PlayerID_1 = require("../utils/PlayerID");
class BanHandler extends BasePunishment_1.default {
    constructor(bot) {
        super(bot, "BAN");
    }
    async handler(server, date, player, admin, duration, reason) {
        if (reason == "Idle") {
            logger_1.default.debug("Bot", "Player kicked for being idle. No action required.");
        }
        if (!(reason === null || reason === void 0 ? void 0 : reason.includes("Vote kick"))) {
            this.savePayload({
                player,
                server,
                date,
                duration,
                reason,
                admin,
            });
        }
        else {
            logger_1.default.info("Bot", `Player ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) was kicked by vote - not sending discord notification.`);
        }
    }
    parseMessage(message) {
        if (message.includes("reason: Idle")) {
            return;
        }
        const regex = new RegExp(/LogMordhauPlayerController: Display: Admin (.+) banned player (.+) \(Duration: (.+), Reason: (.*)\)/g);
        const regexParsed = regex.exec(message);
        if (!regexParsed) {
            logger_1.default.error("Bot", "Failed to parse the regex for message");
            return;
        }
        const admin = regexParsed[1];
        const id = regexParsed[2];
        const duration = regexParsed[3];
        let reason;
        try {
            reason = regexParsed[4];
        }
        catch {
            reason = "None given";
        }
        return { admin, id, duration, reason };
    }
}
exports.default = BanHandler;
