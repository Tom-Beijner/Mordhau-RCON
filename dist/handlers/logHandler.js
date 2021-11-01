"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const banHandler_1 = __importDefault(require("./banHandler"));
const kickHandler_1 = __importDefault(require("./kickHandler"));
const muteHandler_1 = __importDefault(require("./muteHandler"));
const unbanHandler_1 = __importDefault(require("./unbanHandler"));
const unmuteHandler_1 = __importDefault(require("./unmuteHandler"));
class LogHandler {
    constructor(bot) {
        this.bot = bot;
        this.banHandler = new banHandler_1.default(bot);
        this.unbanHandler = new unbanHandler_1.default(bot);
        this.kickHandler = new kickHandler_1.default(bot);
        this.muteHandler = new muteHandler_1.default(bot);
        this.unmuteHandler = new unmuteHandler_1.default(bot);
    }
}
exports.default = LogHandler;
