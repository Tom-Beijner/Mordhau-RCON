import config from "./structures/Config";
import Watchdog from "./structures/Watchdog";
import logger from "./utils/logger";

if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

logger.configureLogger();

new Watchdog(config.get("bot.token"));
