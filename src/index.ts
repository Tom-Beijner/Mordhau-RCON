import config from "./structures/Config";
import Watchdog from "./structures/Watchdog";
import logger from "./utils/logger";

if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

logger.configureLogger();

const token = config.get("bot.token", "");

if (!token) {
    logger.error("Bot", "No bot token found in config.json");

    process.exit(1);
}

new Watchdog(token);
