import pluralize from "pluralize";
import { sendWebhookMessage } from "../../../services/Discord";
import { Punishment } from "../../../structures/AutoMod";
import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import config, { InfractionThreshold } from "../../../structures/Config";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

export default class Warn extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "warn <player name/id>",
            adminsOnly: true,
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.args.length)
            return await ctx.say("Provide a player name or id");

        const admin = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };

        const name = ctx.args.join(" ");

        const player = await ctx.rcon.getIngamePlayer(name);
        if (!player) return await ctx.say("Player not found");
        const cachedPlayer = ctx.bot.cachedPlayers.get(player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(player.id)),
        };

        const playerWarns = await this.bot.database.Warns.findOneAndUpdate(
            { id: player.id },
            {
                $inc: { infractions: 1 },
                $set: {
                    expirationDate: new Date(
                        Date.now() +
                            parseInt(config.get("warns.resetAfterDuration")) *
                                60 *
                                1000
                    ),
                },
            },
            { new: true, upsert: true }
        );

        const infractionThresholds = config.get("warns.infractionThresholds");
        const highestInfractionThreshold = parseInt(
            Object.keys(infractionThresholds).reduce((a, b) =>
                parseInt(a) > parseInt(b) ? a : b
            )
        );
        const infractionIteration =
            playerWarns.infractions / highestInfractionThreshold;

        function onlyDecimals(value: number) {
            value = Math.abs(value);
            return Number((value - Math.floor(value)).toFixed(3));
        }

        function compareDecimals(first: number, second: number) {
            return onlyDecimals(first) === onlyDecimals(second);
        }

        /* 
        To be able to make infinity scaling durations I need to calculate the current iteration compared to the highest threshold value.
        The easiest way is to compare the decimals with the normalization from currentInfractionValue to 0 and 1, doesn't matter what value it is as decimals is used.
        */

        for (const infractionsThreshhold in config.get(
            "warns.infractionThresholds"
        ) as { [key: string]: InfractionThreshold }) {
            if (
                compareDecimals(
                    parseInt(infractionsThreshhold) /
                        highestInfractionThreshold,
                    infractionIteration
                )
            ) {
                const punishment: Punishment = config.get(
                    `warns.infractionThresholds.${infractionsThreshhold}`
                );
                const server = this.bot.cachedPlayers.get(player.id)?.server;
                const message = punishment.message
                    .replace(/{name}/g, player.name)
                    .replace(
                        /{currentWarns}/g,
                        playerWarns.infractions.toString()
                    )
                    .replace(
                        /{maxWarns}/g,
                        Object.keys(
                            config.get("warns.infractionThresholds")
                        ).length.toString()
                    );
                const reason = punishment.reason;
                const duration =
                    infractionIteration > 1
                        ? punishment.duration * Math.ceil(infractionIteration)
                        : punishment.duration;

                switch (punishment.type) {
                    case "message": {
                        await ctx.say(`${message}`);

                        break;
                    }
                    case "mute": {
                        const error = await ctx.rcon.muteUser(
                            server,
                            admin,
                            cachedPlayer,
                            duration
                        );

                        if (error) {
                            logger.error(
                                "Warn",
                                `Error occurred while muting ${
                                    player.name
                                } (${outputPlayerIDs(
                                    cachedPlayer.ids
                                )}) (${error})`
                            );
                        } else {
                            await ctx.say(message);
                        }

                        break;
                    }
                    case "kick": {
                        const error = await ctx.rcon.kickUser(
                            server,
                            admin,
                            cachedPlayer,
                            reason
                        );

                        if (error) {
                            logger.error(
                                "Warn",
                                `Error occurred while kicking ${
                                    player.name
                                } (${outputPlayerIDs(
                                    cachedPlayer.ids
                                )}) (${error})`
                            );
                        } else {
                            await ctx.say(message);
                        }

                        break;
                    }
                    case "ban": {
                        const error = await ctx.rcon.banUser(
                            server,
                            admin,
                            cachedPlayer,
                            duration,
                            reason
                        );

                        if (error) {
                            logger.error(
                                "Warn",
                                `Error occurred while banning ${
                                    player.name
                                } (${outputPlayerIDs(
                                    cachedPlayer.ids
                                )}) (${error})`
                            );
                        } else {
                            await ctx.say(message);
                        }

                        break;
                    }
                    case "globalmute": {
                        const result = await this.bot.rcon.globalMute(
                            admin,
                            cachedPlayer,
                            duration
                        );
                        const failedServers = result.filter(
                            (result) => result.data.failed
                        );

                        if (failedServers.length) {
                            logger.error(
                                "Warn",
                                `Error occurred while globally muting ${
                                    player.name
                                } (${outputPlayerIDs(
                                    cachedPlayer.ids
                                )}) (Failed to mute on ${pluralize(
                                    "server",
                                    failedServers.length
                                )}: ${failedServers
                                    .map(
                                        (server) =>
                                            `${server.name} (${server.data.result})`
                                    )
                                    .join(", ")})`
                            );
                        } else {
                            await ctx.say(message);
                        }

                        break;
                    }
                    case "globalban": {
                        const result = await this.bot.rcon.globalBan(
                            admin,
                            cachedPlayer,
                            duration,
                            reason
                        );
                        const failedServers = result.filter(
                            (result) => result.data.failed
                        );

                        if (failedServers.length) {
                            logger.error(
                                "Warn",
                                `Error occurred while globally banning ${
                                    player.name
                                } (${outputPlayerIDs(
                                    cachedPlayer.ids
                                )}) (Failed to ban on ${pluralize(
                                    "server",
                                    failedServers.length
                                )}: ${failedServers
                                    .map(
                                        (server) =>
                                            `${server.name} (${server.data.result})`
                                    )
                                    .join(", ")})`
                            );
                        } else {
                            await ctx.say(message);
                        }

                        break;
                    }
                }

                sendWebhookMessage(
                    ctx.rcon.webhooks.get("warns"),
                    `${
                        punishment.type === "globalban"
                            ? "Globally ban"
                            : punishment.type === "globalmute"
                            ? "Globally mute"
                            : punishment.type[0].toUpperCase() +
                              punishment.type.substr(1)
                    }${
                        ["ban", "globalban"].includes(punishment.type)
                            ? "ned"
                            : ["warn", "kick"].includes(punishment.type)
                            ? "ed"
                            : "d"
                    } ${removeMentions(cachedPlayer.name)} (${outputPlayerIDs(
                        cachedPlayer.ids,
                        true
                    )}) for reaching warn threshold (Server: ${
                        ctx.rcon.options.name
                    }, Admin: ${removeMentions(admin.name)} (${outputPlayerIDs(
                        admin.ids,
                        true
                    )})${
                        duration
                            ? `, Duration: ${pluralize(
                                  "minute",
                                  duration,
                                  true
                              )}`
                            : ""
                    }, Threshold: ${infractionsThreshhold}, Warnings: ${
                        playerWarns.infractions
                    })`
                );

                logger.info(
                    "Warn",
                    `${
                        punishment.type === "globalban"
                            ? "Globally ban"
                            : punishment.type === "globalmute"
                            ? "Globally mute"
                            : punishment.type[0].toUpperCase() +
                              punishment.type.substr(1)
                    }${
                        ["ban", "globalban"].includes(punishment.type)
                            ? "ned"
                            : ["warn", "kick"].includes(punishment.type)
                            ? "ed"
                            : "d"
                    } ${cachedPlayer.name} (${outputPlayerIDs(
                        cachedPlayer.ids
                    )}) for reaching warn threshold (Server: ${
                        ctx.rcon.options.name
                    }, Admin: ${admin.name} (${outputPlayerIDs(admin.ids)})${
                        duration
                            ? `, Duration: ${pluralize(
                                  "minute",
                                  duration,
                                  true
                              )}`
                            : ""
                    }, Threshold: ${infractionsThreshhold}, Warnings: ${
                        playerWarns.infractions
                    })`
                );

                if (config.get("warns.infiniteDurationScaling")) return;

                if (
                    parseInt(infractionsThreshhold) >=
                    highestInfractionThreshold
                ) {
                    await this.bot.database.Warns.deleteOne({
                        id: player.id,
                    });

                    logger.info(
                        "Warn",
                        `Reset ${cachedPlayer.name} (${outputPlayerIDs(
                            cachedPlayer.ids
                        )}) infractions`
                    );
                }
            }
        }
    }
}
