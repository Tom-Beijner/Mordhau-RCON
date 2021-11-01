"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashdash_1 = __importDefault(require("dashdash"));
const logger_1 = __importDefault(require("../utils/logger"));
class RCONCommandContext {
    constructor(command, bot, rcon, player, message, args) {
        var _a, _b;
        this.bot = bot;
        this.rcon = rcon;
        this.player = player;
        this.message = message;
        if (!((_a = command.meta) === null || _a === void 0 ? void 0 : _a.options.length)) {
            this.args = args;
            return;
        }
        try {
            const parsed = dashdash_1.default.parse({
                argv: ["argv", "args", ...args],
                options: (_b = command.meta) === null || _b === void 0 ? void 0 : _b.options,
            });
            this.opts = parsed;
            this.args = parsed._args;
        }
        catch (err) {
            logger_1.default.error("RCON Context", `Error occurred while parsing args (${err.message || err})`);
        }
    }
    say(content) {
        return this.rcon.say(content);
    }
}
exports.default = RCONCommandContext;
