import flatMap from "array.prototype.flatmap";
import BigNumber from "bignumber.js";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import { sendWebhookMessage } from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import { Punishment } from "../../../structures/AutoMod";
import config, { InfractionThreshold, Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import parseOut from "../../../utils/parseOut";
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

export default class Warn extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Warn a player",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.get("servers").map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign(
                {},
                ...bot.client.guilds.map((guild) => ({
                    [guild.id]: flatMap(
                        (config.get("discord.roles") as Role[]).filter((role) =>
                            role.commands.includes(commandName)
                        ),
                        (role) =>
                            role.Ids.map((id) => ({
                                type: ApplicationCommandPermissionType.ROLE,
                                id,
                                permission: true,
                            }))
                    ),
                }))
            ),
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            server: ctx.options.server as string,
            player: ctx.options.player as string,
            duration: new BigNumber(ctx.options.duration as number),
            reason: ctx.options.reason as string | null,
        };

        const server = this.bot.servers.get(options.server);
        if (!server) {
            return (await ctx.send(
                `Server not found, existing servers are: ${[
                    ...this.bot.servers.keys(),
                ].join(", ")}`
            )) as Message;
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(
                `Not ${
                    !server.rcon.connected ? "connected" : "authenticated"
                } to server`
            )) as Message;
        }

        const ingamePlayer = await server.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get(
            ingamePlayer?.id || options.player
        ) || {
            server: server.name,
            ...(await LookupPlayer(ingamePlayer?.id || options.player)),
        };

        if (!player?.id) {
            return await ctx.send("Invalid player provided");
        }

        try {
            const playerWarns = await this.bot.database.Warns.findOneAndUpdate(
                { id: player.id },
                {
                    $inc: { infractions: 1 },
                    $set: {
                        expirationDate: new Date(
                            Date.now() +
                                parseInt(
                                    config.get("warns.resetAfterDuration")
                                ) *
                                    60 *
                                    1000
                        ),
                    },
                },
                { new: true, upsert: true }
            );

            const infractionThresholds = config.get(
                "warns.infractionThresholds"
            );
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

            for (const infractionsThreshhold in infractionThresholds as {
                [key: string]: InfractionThreshold;
            }) {
                if (
                    compareDecimals(
                        parseInt(infractionsThreshhold) /
                            highestInfractionThreshold,
                        infractionIteration
                    )
                ) {
                    const admin = {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    };
                    const punishment: Punishment = config.get(
                        `warns.infractionThresholds.${infractionsThreshhold}`
                    );
                    const serverName = this.bot.cachedPlayers.get(
                        player.id
                    )?.server;
                    const message = punishment.message
                        .replace(/{name}/g, player.name)
                        .replace(
                            /{currentWarns}/g,
                            playerWarns.infractions.toString()
                        )
                        .replace(
                            /{maxWarns}/g,
                            highestInfractionThreshold.toString()
                        );
                    const reason = punishment.reason;
                    const duration = new BigNumber(
                        infractionIteration > 1
                            ? punishment.duration *
                              Math.ceil(infractionIteration)
                            : punishment.duration
                    );

                    switch (punishment.type) {
                        case "message": {
                            await server.rcon.say(`${message}`);

                            break;
                        }
                        case "mute": {
                            const error = await server.rcon.muteUser(
                                serverName,
                                admin,
                                player,
                                duration
                            );

                            if (error) {
                                logger.error(
                                    "Warn",
                                    `Error occurred while muting ${
                                        player.name
                                    } (${outputPlayerIDs(
                                        player.ids
                                    )}) (${error})`
                                );
                            } else {
                                await server.rcon.say(message);
                            }

                            break;
                        }
                        case "kick": {
                            const error = await server.rcon.kickUser(
                                serverName,
                                admin,
                                player,
                                reason
                            );

                            if (error) {
                                logger.error(
                                    "Warn",
                                    `Error occurred while kicking ${
                                        player.name
                                    } (${outputPlayerIDs(
                                        player.ids
                                    )}) (${error})`
                                );
                            } else {
                                await server.rcon.say(message);
                            }

                            break;
                        }
                        case "ban": {
                            const error = await server.rcon.banUser(
                                serverName,
                                admin,
                                player,
                                duration,
                                reason
                            );

                            if (error) {
                                logger.error(
                                    "Warn",
                                    `Error occurred while banning ${
                                        player.name
                                    } (${outputPlayerIDs(
                                        player.ids
                                    )}) (${error})`
                                );
                            } else {
                                await server.rcon.say(message);
                            }

                            break;
                        }
                        case "globalmute": {
                            const result = await this.bot.rcon.globalMute(
                                admin,
                                player,
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
                                        player.ids
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
                                await server.rcon.say(message);
                            }

                            break;
                        }
                        case "globalban": {
                            const result = await this.bot.rcon.globalBan(
                                admin,
                                player,
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
                                        player.ids
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
                                await server.rcon.say(message);
                            }

                            break;
                        }
                    }

                    sendWebhookMessage(
                        server.rcon.webhooks.get("warns"),
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
                        } ${parseOut(player.name)} (${outputPlayerIDs(
                            player.ids,
                            true
                        )}) for reaching warn threshold (Server: ${
                            server.rcon.options.name
                        }, Admin: ${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } (${ctx.member.id})${
                            duration
                                ? `, Duration: ${pluralize(
                                      "minute",
                                      duration.toNumber(),
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
                        } ${player.name} (${outputPlayerIDs(
                            player.ids
                        )}) for reaching warn threshold (Server: ${
                            server.rcon.options.name
                        }, Admin: ${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } (${ctx.member.id})${
                            duration
                                ? `, Duration: ${pluralize(
                                      "minute",
                                      duration.toNumber(),
                                      true
                                  )}`
                                : ""
                        }, Threshold: ${infractionsThreshhold}, Warnings: ${
                            playerWarns.infractions
                        })`
                    );

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${ctx.member.user.discriminator} warned ${player.name} (${player.id}) (Server: ${server.rcon.options.name}, Threshold: ${infractionsThreshhold}, Warnings: ${playerWarns.infractions})`
                    );

                    await ctx.send({
                        embeds: [
                            {
                                description: `${
                                    punishment.type === "globalban"
                                        ? "Globally ban"
                                        : punishment.type === "globalmute"
                                        ? "Globally mute"
                                        : punishment.type[0].toUpperCase() +
                                          punishment.type.substr(1)
                                }${
                                    ["ban", "globalban"].includes(
                                        punishment.type
                                    )
                                        ? "ned"
                                        : ["warn", "kick"].includes(
                                              punishment.type
                                          )
                                        ? "ed"
                                        : "d"
                                } ${player.name} (${outputPlayerIDs(
                                    player.ids,
                                    true
                                )}) for reaching warn threshold (Server: ${
                                    server.rcon.options.name
                                }, Admin: ${ctx.member.displayName}#${
                                    ctx.member.user.discriminator
                                } (${ctx.member.id})${
                                    duration
                                        ? `, Duration: ${pluralize(
                                              "minute",
                                              duration.toNumber(),
                                              true
                                          )}`
                                        : ""
                                }, Threshold: ${infractionsThreshhold}, Warnings: ${
                                    playerWarns.infractions
                                })`,
                            },
                        ],
                    });

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
                            `Reset ${player.name} (${outputPlayerIDs(
                                player.ids
                            )}) infractions`
                        );
                    }
                }
            }
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
