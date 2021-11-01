"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BasePunishment_1 = __importDefault(require("../structures/BasePunishment"));
const logger_1 = __importDefault(require("../utils/logger"));
class KickHandler extends BasePunishment_1.default {
    constructor(bot) {
        super(bot, "KICK");
    }
    async handler(server, date, player, admin, duration, reason) {
        this.savePayload({
            player,
            server,
            date,
            reason,
            admin,
        });
    }
    parseMessage(message) {
        if (message.includes("reason: Idle")) {
            return;
        }
        const regex = new RegExp(/LogMordhauPlayerController: Display: Admin (.+) kicked player (.+) \(Reason: (.*)\)/g);
        const regexParsed = regex.exec(message);
        if (!regexParsed) {
            logger_1.default.error("Bot", "Failed to parse the regex for message");
            return;
        }
        const admin = regexParsed[1];
        const id = regexParsed[2];
        let reason;
        try {
            reason = regexParsed[3];
        }
        catch {
            reason = "None given";
        }
        return { admin, id, reason };
    }
}
exports.default = KickHandler;
