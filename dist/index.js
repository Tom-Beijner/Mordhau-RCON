"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = __importDefault(require("./structures/Config"));
const Watchdog_1 = __importDefault(require("./structures/Watchdog"));
const logger_1 = __importDefault(require("./utils/logger"));
if (!process.env.NODE_ENV)
    process.env.NODE_ENV = "development";
logger_1.default.configureLogger();
const token = Config_1.default.get("bot.token", "");
if (!token) {
    logger_1.default.error("Bot", "No bot token found in config.json");
    process.exit(1);
}
new Watchdog_1.default(token);
