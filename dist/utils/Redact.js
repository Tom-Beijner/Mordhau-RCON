"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = void 0;
const Config_1 = __importDefault(require("../structures/Config"));
function redact(code) {
    const tokens = [
        Config_1.default.get("bot.token"),
        Config_1.default.get("steam.key"),
        Config_1.default.get("database.host"),
        Config_1.default.get("database.username"),
        Config_1.default.get("database.password")
            .replace("*", "\\*")
            .replace("^", "\\^"),
        ...Config_1.default.get("servers").map((server) => server.rcon.password),
    ];
    const regex = new RegExp(tokens.join("|"), "gi");
    return code.replace(regex, "|REDACTED|");
}
exports.redact = redact;
