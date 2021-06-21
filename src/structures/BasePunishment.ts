import { addHours, addMinutes, formatDistanceToNow } from "date-fns";
import fetch from "node-fetch";
import pluralize from "pluralize";
import config from "../config.json";
import { ILog } from "../models/logSchema";
import { sendWebhookEmbed, sendWebhookMessage } from "../services/Discord";
import { hastebin } from "../utils/Hastebin";
import logger from "../utils/logger";
import { outputPlayerIDs, parsePlayerID } from "../utils/PlayerID";
import Watchdog from "./Watchdog";

type Types = "MUTE" | "UNMUTE" | "KICK" | "BAN" | "UNBAN";

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
        duration: number,
        reason: string
    ) {
        const rcon = this.bot.servers.get(server).rcon;

        // logger.info("Looking up playername by steam ID");

        return this.handler(
            server,
            date,
            (player?.name ? player : null) ||
                this.bot.cachedPlayers.get(player.id) ||
                (await rcon.getPlayerToCache(player.id)),
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
        duration?: number,
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
        duration?: number;
        reason?: string;
    }) {
        logger.info(
            "Bot",
            `${payload.admin.name} (${outputPlayerIDs(
                payload.admin.ids
            )}) ${this.type.toLowerCase()}${
                ["BAN", "UNBAN"].includes(this.type)
                    ? "ned"
                    : this.type === "KICK"
                    ? "ed"
                    : "d"
            } ${payload.player.name} (${outputPlayerIDs(payload.player.ids)})${
                typeof payload.duration === "number"
                    ? !payload.duration
                        ? "PERMANENTLY"
                        : ` for ${pluralize("minute", payload.duration, true)}`
                    : ""
            }${
                payload.reason && payload.reason.length
                    ? ` with the reason: ${payload.reason}`
                    : ""
            }`
        );

        const server = config.servers.find(
            (server) => server.name === payload.server
        );

        if (process.env.NODE_ENV.trim() !== "production") return;

        if (["KICK", "BAN"].includes(this.type))
            this.bot.punishedPlayers.set(payload.player.id, {
                punishment: this.type,
                admin: payload.admin,
            });

        const playerHistory = await this.bot.database.getPlayerHistory([
            payload.player.ids.playFabID,
            payload.player.ids.steamID,
        ]);

        let playeravatar: string;
        if (playerHistory.ids.steamID) {
            await fetch(
                `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steam.key}&steamids=${playerHistory.ids.steamID}`
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
            type: this.type,
            history: playerHistory.history,
            previousNames: playerHistory.previousNames,
        });

        const punishments = server.rcon.punishments;

        if (
            !punishments.shouldSave ||
            !punishments.types[`${this.type.toLocaleLowerCase()}s`]
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
            type: this.type,
            player: payload.player.name,
            server: payload.server,
            id: payload.player.id,
            date: new Date(payload.date).getTime(),
            admin: `${payload.admin.name} (${payload.admin.id})`,
            reason: payload.reason,
            duration: payload.duration,
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
        duration?: number;
        reason?: string;
        history: ILog[];
    }) {
        logger.debug("Bot", "Getting channel ID.");

        let duration = data.duration && data.duration.toString();

        if (!data.duration) {
            duration = "PERMANENT";

            if (data.type === "BAN")
                sendWebhookMessage(
                    config.discord.webhookEndpoints.permanent,
                    `${data.player.name} (${outputPlayerIDs(
                        data.player.ids,
                        true
                    )}) in ${data.server}`
                );
        } else duration += ` ${pluralize("minute", data.duration)}`;

        let pastOffenses: string;
        let historyOverTen = false;
        let pastBansAmount = 0;
        let totalDuration = data.duration || 0;
        let suggestion: string;

        if (!data.history.length) pastOffenses = "None";
        else {
            pastOffenses = "\n------------------";

            if (data.history.length > 10) {
                historyOverTen = true;
            }

            for (let i = 0; i < data.history.length; i++) {
                const offense: string[] = [];
                const h = data.history[i];
                const type = h.type;
                const admin = h.admin;
                const date = new Date(h.date);

                if (type === "BAN") pastBansAmount++;

                let historyDuration: string;
                if (!h.duration) historyDuration = "PERMANENT";
                else {
                    historyDuration = pluralize("minute", h.duration, true);
                    totalDuration += h.duration;
                }

                offense.push(
                    [
                        `\nType: ${type}`,
                        `Server: ${h.server}`,
                        `Platform: ${parsePlayerID(h.id).platform}`,
                        `Date: ${date.toDateString()} (${formatDistanceToNow(
                            date,
                            { addSuffix: true }
                        )})`,
                        `Offense: ${h.reason || "None given"}`,
                        `Duration: ${historyDuration} ${
                            h.duration
                                ? `(Un${
                                      type === "BAN" ? "banned" : "muted"
                                  } ${formatDistanceToNow(
                                      addMinutes(date, h.duration),
                                      { addSuffix: true }
                                  )})`
                                : ""
                        }`,
                        `Admin: ${admin}\n------------------`,
                    ].join("\n")
                );

                pastOffenses += offense.join("\n");
            }

            if (historyOverTen)
                pastOffenses += "\nHas over 10 punishments\n------------------";

            if (
                (pastBansAmount > 2 && data.type === "BAN") ||
                pastBansAmount > 2
            )
                suggestion = "\n**SUGGESTION**: PERMA BAN\n";

            if (pastOffenses.length < 1025)
                pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
        }

        if (pastOffenses.length > 1024)
            pastOffenses = `The output was too long, but was uploaded to [hastebin](${await hastebin(
                pastOffenses
            )})`;

        logger.info(
            "Bot",
            `Sending ${data.type.toLowerCase()} to punishments webhook`
        );

        let message = [
            suggestion,
            `**Server**: \`${data.server}\``,
            `**Admin**: \`${data.admin.name} (${data.admin.id})\``,
        ];

        let color: number;

        if (data.type === "BAN") {
            message.push(
                `**Offense**: \`${data.reason || "None given"}\``,
                `**Duration**: \`${duration}${
                    data.duration
                        ? ` (Unbanned ${formatDistanceToNow(
                              addMinutes(new Date(), parseInt(duration)),
                              { addSuffix: true }
                          )})`
                        : ""
                }\``
            );

            color = 15158332;
        }

        if (data.type === "MUTE") {
            message.push(
                `**Duration**: \`${duration} ${
                    data.duration
                        ? `(Unmuted ${formatDistanceToNow(
                              addMinutes(new Date(), parseInt(duration)),
                              { addSuffix: true }
                          )})`
                        : ""
                }\``
            );

            color = 3447003;
        }

        if (data.type === "UNMUTE") {
            color = 0x7289da;
        }

        if (data.type === "KICK") {
            message.push(`**Offense**: \`${data.reason || "None given"}\``);
            color = 0x34495e;
        }

        if (data.type === "UNBAN") {
            color = 3066993;
        }

        // const archives = await this.bot.database.getArchives(
        //     data.player.ids.playFabID
        // );

        sendWebhookEmbed(config.discord.webhookEndpoints.punishments, {
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
                            totalDuration,
                            true
                        )}\``,
                    ].join("\n"),
                },
                {
                    name: "Previous Offenses",
                    value: pastOffenses,
                },
            ],
            color,
            image: {
                url: data.playeravatar,
            },
            timestamp: addHours(new Date(data.date), 1).toISOString(),
        });

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
        duration?: number,
        reason?: string
    ) {
        return this._handler(
            server,
            date.getTime(),
            player,
            admin,
            duration,
            reason
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
