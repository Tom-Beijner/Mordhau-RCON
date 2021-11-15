import BigNumber from "bignumber.js";
import { addMinutes, formatDistanceToNow } from "date-fns";
import fetch from "node-fetch";
import pluralize from "pluralize";
import { ILog } from "../models/logSchema";
import { sendWebhookEmbed, sendWebhookMessage } from "../services/Discord";
import { LookupPlayer } from "../services/PlayFab";
import config from "../structures/Config";
import { hastebin } from "../utils/Hastebin";
import logger from "../utils/logger";
import { outputPlayerIDs, parsePlayerID } from "../utils/PlayerID";
import removeMentions from "../utils/RemoveMentions";
import Watchdog from "./Watchdog";

type Types = "MUTE" | "UNMUTE" | "KICK" | "BAN" | "UNBAN";
// | "GLOBAL BAN"
// | "GLOBAL MUTE"
// | "GLOBAL UNBAN"
// | "GLOBAL UNMUTE";

export default abstract class BasePunishment {
    public bot: Watchdog;
    public type: Types;

    constructor(bot: Watchdog, type: Types) {
        this.bot = bot;
        this.type = type;
    }

    private async _handler(
        server: string,
        date: number,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        duration?: BigNumber,
        reason?: string,
        global?: boolean
    ) {
        const fetchedPlayer =
            (player?.name ? player : null) ||
            this.bot.cachedPlayers.get(player.id) ||
            (await LookupPlayer(player.id));

        if (global) {
            this.savePayload({
                player: fetchedPlayer,
                server,
                date,
                duration,
                reason,
                admin,
                global,
            });

            return;
        }

        return this.handler(
            server,
            date,
            fetchedPlayer,
            admin,
            duration,
            reason
        );
    }

    /**
     * @arg {{
     *   message: string;
     *   server: string;
     *   date: number;
     *   player: { id: string; name?: string };
     *   parsed: {
     *     admin: string;
     *     id: string;
     *     duration?: number;
     *     reason?: string;
     *   } | null;
     * }} event Event data
     * @returns {Promise<void>} Return a promise of void
     */
    public abstract handler(
        server: string,
        date: number,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        duration?: BigNumber,
        reason?: string
    ): Promise<void>;

    /**
     * @arg {string} message Line to run against
     * @returns {{ admin: string; id: string; duration?: number; reason?: string } | null} Return a promise of void
     */
    public abstract parseMessage(
        message: string
    ): { admin: string; id: string; duration?: string; reason?: string } | null;

    public async savePayload(payload: {
        server: string;
        date: number;
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        };
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        };
        duration?: BigNumber;
        reason?: string;
        global?: boolean;
    }) {
        const type = `${
            payload.global && this.type !== "KICK" ? "GLOBAL " : ""
        }${this.type}` as Types;
        const duration = new BigNumber(payload.duration);

        logger.info(
            "Bot",
            `${payload.admin.name} (${outputPlayerIDs(
                payload.admin.ids
            )}) ${type.toLowerCase().replace("global", "globally")}${
                ["BAN", "UNBAN", "GLOBAL BAN", "GLOBAL UNBAN"].includes(type)
                    ? "ned"
                    : type === "KICK"
                    ? "ed"
                    : "d"
            } ${payload.player.name} (${outputPlayerIDs(payload.player.ids)})${
                !duration.isNaN()
                    ? duration.isEqualTo(0)
                        ? " PERMANENTLY"
                        : ` for ${pluralize(
                              "minute",
                              duration.toNumber(),
                              true
                          )}`
                    : ""
            }${
                payload.reason &&
                payload.reason.length &&
                payload.reason !== "None given"
                    ? ` with the reason: ${payload.reason}`
                    : ""
            }`
        );

        const server = config
            .get("servers")
            .find((server) => server.name === payload.server);

        if (["KICK", "BAN", "GLOBAL BAN"].includes(type))
            this.bot.punishedPlayers.set(payload.player.id, {
                punishment: type,
                admin: payload.admin,
            });

        const playerHistory = await this.bot.database.getPlayerHistory([
            payload.player.ids.playFabID,
            payload.player.ids.steamID,
        ]);

        let playeravatar: string;
        if (playerHistory.ids.steamID) {
            await fetch(
                `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.get(
                    "steam.key"
                )}&steamids=${playerHistory.ids.steamID}`
            )
                .then(async (res) => {
                    const json = await res.json();
                    if (!payload.player.name)
                        payload.player.name =
                            json["response"]["players"][0]["personaname"];
                    playeravatar = json["response"]["players"][0]["avatarfull"];
                })
                .catch(() => {
                    // return { content: "Error looking up user on steam" }
                    // playername = undefined;
                    // playeravatar = undefined;
                });
        }

        const playFabID =
            payload.player.ids.playFabID || playerHistory.ids.playFabID;

        const steamID = payload.player.ids.steamID || playerHistory.ids.steamID;

        this.sendMessage({
            ...payload,
            player: {
                ids: {
                    playFabID,
                    steamID,
                },
                id: playFabID,
                name: payload.player.name,
            },
            playeravatar,
            type,
            history: playerHistory.history,
            previousNames: playerHistory.previousNames,
        });

        const punishments = server?.rcon.punishments;

        if (
            (!payload.global &&
                punishments &&
                (!punishments.shouldSave ||
                    !punishments.types[`${this.type.toLocaleLowerCase()}s`])) ||
            process.env.NODE_ENV.trim() !== "production"
        )
            return;

        this.bot.database.updatePlayerHistory({
            ids: [
                {
                    platform: "PlayFab",
                    id: playFabID,
                },
                {
                    platform: "Steam",
                    id: steamID,
                },
            ],
            type,
            player: payload.player.name,
            server: payload.server,
            id: payload.player.id,
            date: new Date(payload.date).getTime(),
            admin: `${payload.admin.name} (${payload.admin.id})`,
            reason: payload.reason,
            duration: duration,
        });
    }

    public async sendMessage(data: {
        type: Types;
        server: string;
        date: number;
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        };
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        };
        playeravatar?: string;
        previousNames: string;
        duration?: BigNumber;
        reason?: string;
        history: ILog[];
        global?: boolean;
    }) {
        let duration =
            !data.duration?.isEqualTo(0) && data.duration?.toString();

        if (data.duration?.isEqualTo(0)) {
            duration = "PERMANENT";

            if (["BAN", "GLOBAL BAN"].includes(data.type)) {
                const server = this.bot.servers.get(data.server);
                const payload = `${removeMentions(
                    data.player.name
                )} (${outputPlayerIDs(data.player.ids, true)}) ${
                    data.global ? "globally" : `in ${data.server}`
                }`;

                if (server) {
                    sendWebhookMessage(
                        server.rcon.webhooks.get("permanent"),
                        payload
                    );
                } else {
                    for (const [serverName, server] of this.bot.servers) {
                        sendWebhookMessage(
                            server.rcon.webhooks.get("permanent"),
                            payload
                        );
                    }
                }
            }
        } else duration += ` ${pluralize("minute", data.duration?.toNumber())}`;

        let pastOffenses: string;
        let totalDuration = data.duration || new BigNumber(0);

        if (!data.history.length) pastOffenses = "None";
        else {
            pastOffenses = "------------------";

            for (let i = 0; i < data.history.length; i++) {
                const offenses: string[] = [];
                const h = data.history[i];
                const type = h.type;
                const admin = h.admin;
                const date = new Date(h.date);

                let historyDuration: string;
                if (
                    !h.duration ||
                    h.duration.isEqualTo(0) ||
                    h.duration.isNaN()
                )
                    historyDuration = "PERMANENT";
                else {
                    historyDuration = pluralize(
                        "minute",
                        h.duration.toNumber(),
                        true
                    );

                    totalDuration = totalDuration.plus(h.duration);
                }

                offenses.push(
                    [
                        `\nID: ${h._id}`,
                        `Type: ${type}`,
                        type.includes("GLOBAL")
                            ? undefined
                            : `Server: ${h.server}`,
                        `Platform: ${parsePlayerID(h.id).platform}`,
                        `Date: ${date.toDateString()} (${formatDistanceToNow(
                            date,
                            { addSuffix: true }
                        )})`,
                        `Admin: ${admin}`,
                        `Offense: ${h.reason || "None given"}`,
                        ["BAN", "MUTE", "GLOBAL BAN", "GLOBAL MUTE"].includes(
                            type
                        )
                            ? `Duration: ${historyDuration}${
                                  h.duration?.isEqualTo(0)
                                      ? ""
                                      : ` (Un${
                                            ["BAN", "GLOBAL BAN"].includes(type)
                                                ? "banned"
                                                : "muted"
                                        } ${formatDistanceToNow(
                                            addMinutes(
                                                date,
                                                h.duration.toNumber()
                                            ),
                                            { addSuffix: true }
                                        )})`
                              }`
                            : undefined,
                        `------------------`,
                    ]
                        .filter((line) => typeof line !== "undefined")
                        .join("\n")
                );

                pastOffenses += offenses.join("\n");
            }

            if (pastOffenses.length < 1025)
                pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
        }

        if (pastOffenses.length > 1024)
            pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                pastOffenses
            )})`;

        logger.info(
            "Bot",
            `Sending ${data.type.toLowerCase()} to punishments webhook`
        );

        let message = [
            data.global ? undefined : `**Server**: \`${data.server}\``,
            `**Admin**: \`${data.admin.name} (${data.admin.id})\``,
        ].filter((line) => typeof line !== "undefined");

        let color: number;

        if (["BAN", "GLOBAL BAN"].includes(data.type)) {
            message.push(
                `**Offense**: \`${data.reason || "None given"}\``,
                `**Duration**: \`${duration}${
                    data.duration?.isEqualTo(0)
                        ? ""
                        : ` (Unbanned ${formatDistanceToNow(
                              addMinutes(
                                  new Date(),
                                  new BigNumber(data.duration).toNumber()
                              ),
                              { addSuffix: true }
                          )})`
                }\``
            );

            color = data.type === "BAN" ? 15158332 : 10038562;
        }

        if (["MUTE", "GLOBAL MUTE"].includes(data.type)) {
            message.push(
                `**Duration**: \`${duration} ${
                    data.duration?.isEqualTo(0)
                        ? ""
                        : `(Unmuted ${formatDistanceToNow(
                              addMinutes(
                                  new Date(),
                                  new BigNumber(data.duration).toNumber()
                              ),
                              { addSuffix: true }
                          )})`
                }\``
            );

            color = data.type === "MUTE" ? 3447003 : 2123412;
        }

        if (["UNMUTE", "GLOBAL UNMUTE"].includes(data.type)) {
            color = data.type === "UNMUTE" ? 7506394 : 4675208;
        }

        if (data.type === "KICK") {
            message.push(`**Offense**: \`${data.reason || "None given"}\``);
            color = 3426654;
        }

        if (["UNBAN", "GLOBAL UNBAN"].includes(data.type)) {
            color = data.type === "UNBAN" ? 3066993 : 2067276;
        }

        const server = this.bot.servers.get(data.server);
        const payload = {
            title: `${data.type} REPORT`,
            description: message.join("\n"),
            fields: [
                {
                    name: "Player",
                    value: [
                        `**Name**: \`${data.player.name}\``,
                        `**PlayFabID**: \`${data.player.ids.playFabID}\``,
                        `**SteamID**: [${data.player.ids.steamID}](<http://steamcommunity.com/profiles/${data.player.ids.steamID}>)`,
                        `**Previous Names**: \`${
                            data.previousNames.length
                                ? data.previousNames
                                : "None"
                        }\``,
                        `**Total Duration**: \`${pluralize(
                            "minute",
                            totalDuration.toNumber(),
                            true
                        )}\``,
                    ].join("\n"),
                },
                {
                    name: `Previous Offenses (${data.history.length})`,
                    value: pastOffenses,
                },
            ],
            color,
            image: {
                url: data.playeravatar,
            },
            timestamp: new Date(data.date).toISOString(),
        };

        if (server) {
            sendWebhookEmbed(server.rcon.webhooks.get("punishments"), payload);
        } else {
            for (const [serverName, server] of this.bot.servers) {
                sendWebhookEmbed(
                    server.rcon.webhooks.get("punishments"),
                    payload
                );
            }
        }

        logger.debug("Bot", "Message sent.");
    }

    public execute(
        server: string,
        date: Date,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        duration?: BigNumber,
        reason?: string,
        global?: boolean
    ) {
        return this._handler(
            server,
            date.getTime(),
            player,
            admin,
            duration,
            reason,
            global
        );
    }

    // public async parse(
    //     line: string,
    //     server: string,
    //     date: Date,
    //     player?: {
    //         ids: { playFabID: string; steamID?: string };
    //         id: string;
    //         name?: string;
    //     }
    // ) {
    //     logger.debug(
    //         "Bot",
    //         `Parsing potential ${this.type.toLowerCase()} message (${line})`
    //     );
    //     const parsed = this.parseMessage(line);
    //     if (!parsed) return;

    //     player =
    //         !player &&
    //         (this.bot.cachedPlayers.get(parsed.id) ||
    //             (await LookupPlayer(parsed.id)));
    //     const admin =
    //         this.bot.cachedPlayers.get(parsed.admin) ||
    //         (await LookupPlayer(parsed.admin));
    //     console.log(parsed.admin, admin);
    //     return this.execute(
    //         server,
    //         date,
    //         player,
    //         admin,
    //         parseInt(parsed.duration),
    //         parsed.reason
    //     );
    // }
}
