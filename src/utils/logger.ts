import date from "date-fns-tz";
import { createLogger, format, Logger, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import Config from "../structures/Config";
export default class logger {
    private static logger: Logger;

    private static SetLogger() {
        const logFormat = format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}  ${message}`;
        });
        const timestamp = format((info, opts: { timeZone: string }) => {
            if (opts.timeZone)
                info.timestamp = date.format(
                    new Date(),
                    "yyyy-MM-dd kk:mm:ss.SSS O",
                    {
                        timeZone: opts.timeZone,
                    }
                );

            return info;
        });

        const fileTransport = new DailyRotateFile({
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
            this.info(
                "Logs",
                `Rotating log file from ${oldFilename} to ${newFilename}`
            );
        });

        this.logger = createLogger({
            level:
                (process.env.LOG_LEVEL && process.env.LOG_LEVEL.trim()) ||
                "info",
            format: format.combine(
                format.colorize(),
                format.errors({ stack: true }),
                timestamp({
                    timeZone:
                        Config.get("consoleTimezone") ||
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                }), // Europe/Berlin
                logFormat
            ),
            transports: [new transports.Console(), fileTransport],
            exitOnError: false,
        });
    }

    public static configureLogger() {
        this.SetLogger();
    }

    private static GetValue(name: string, value: any) {
        if (typeof value === "string") {
            return `${name} - ${value}`;
        } else {
            return `${name} - ${JSON.stringify(value)}`;
        }
    }

    public static debug(name: string, value: any) {
        this.logger.log("debug", this.GetValue(name, value));
    }

    public static error(name: string, value: any) {
        this.logger.log("error", this.GetValue(name, value));
    }

    public static warn(name: string, value: any) {
        this.logger.log("warn", this.GetValue(name, value));
    }

    public static info(name: string, value: any) {
        this.logger.log("info", this.GetValue(name, value));
    }
}
