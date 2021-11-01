"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_tz_1 = require("date-fns-tz");
const winston_1 = require("winston");
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const Config_1 = __importDefault(require("../structures/Config"));
class logger {
    static SetLogger() {
        const logFormat = winston_1.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}  ${message}`;
        });
        const timestamp = winston_1.format((info, opts) => {
            if (opts.timeZone)
                info.timestamp = date_fns_tz_1.format(date_fns_tz_1.utcToZonedTime(date_fns_tz_1.zonedTimeToUtc(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone), opts.timeZone), "yyyy-MM-dd kk:mm:ss.SSS O", {
                    timeZone: opts.timeZone,
                });
            return info;
        });
        const fileTransport = new winston_daily_rotate_file_1.default({
            filename: "%DATE%",
            extension: ".log",
            dirname: "logs",
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d",
            maxSize: "20m",
            zippedArchive: true,
            createSymlink: true,
        });
        fileTransport.on("rotate", (oldFilename, newFilename) => {
            this.info("Logs", `Rotating log file from ${oldFilename} to ${newFilename}`);
        });
        this.logger = winston_1.createLogger({
            level: (process.env.LOG_LEVEL && process.env.LOG_LEVEL.trim()) ||
                "info",
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.errors({ stack: true }), timestamp({
                timeZone: Config_1.default.get("consoleTimezone") ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
            }), logFormat),
            transports: [new winston_1.transports.Console(), fileTransport],
            exitOnError: false,
        });
    }
    static configureLogger() {
        this.SetLogger();
    }
    static GetValue(name, value) {
        if (typeof value === "string") {
            return `${name} - ${value}`;
        }
        else {
            return `${name} - ${JSON.stringify(value)}`;
        }
    }
    static debug(name, value) {
        this.logger.log("debug", this.GetValue(name, value));
    }
    static error(name, value) {
        this.logger.log("error", this.GetValue(name, value));
    }
    static warn(name, value) {
        this.logger.log("warn", this.GetValue(name, value));
    }
    static info(name, value) {
        this.logger.log("info", this.GetValue(name, value));
    }
}
exports.default = logger;
