"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BasePunishment_1 = __importDefault(require("../structures/BasePunishment"));
const logger_1 = __importDefault(require("../utils/logger"));
class UnmuteHandler extends BasePunishment_1.default {
    constructor(bot) {
        super(bot, "UNMUTE");
    }
    async handler(server, date, player, admin) {
        this.savePayload({
            player,
            server,
            date,
            admin,
        });
    }
    parseMessage(message) {
        if (message.includes("reason: Idle")) {
            return;
        }
        const regex = new RegExp(/LogMordhauPlayerController: Display: Admin (.+) unmuted player (.+)/g);
        const regexParsed = regex.exec(message);
        if (!regexParsed) {
            logger_1.default.error("Bot", "Failed to parse the regex for message");
            return;
        }
        const admin = regexParsed[1];
        const id = regexParsed[2];
        return { admin, id };
    }
}
exports.default = UnmuteHandler;
