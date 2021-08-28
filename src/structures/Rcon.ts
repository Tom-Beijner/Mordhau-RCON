import flatMap from "array.prototype.flatmap";
import { compareArrayVals } from "crud-object-diff";
import { addSeconds, formatDistanceToNow } from "date-fns";
import deepClean from "deep-cleaner";
import { matchSorter } from "match-sorter";
import pluralize from "pluralize";
import { Rcon as RconClient } from "../rcon";
import { mentionRole, sendWebhookMessage } from "../services/Discord";
import { LookupPlayer } from "../services/PlayFab";
import config, { Role } from "../structures/Config";
import { hastebin } from "../utils";
import logger from "../utils/logger";
import { outputPlayerIDs } from "../utils/PlayerID";
import removeMentions from "../utils/RemoveMentions";
import KillStreak from "./KillStreak";
import RCONCommandContext from "./RCONCommandContext";
import Watchdog from "./Watchdog";

export default class Rcon {
    bot: Watchdog;
    rcon: RconClient;
    keepAlive: any;
    initiate: boolean = true;
    connected: boolean = false;
    authenticated: boolean = false;
    reconnecting: boolean = false;
    webhooks: Map<
        | "chat"
        | "punishments"
        | "activity"
        | "wanted"
        | "permanent"
        | "automod"
        | "killstreak"
        | "adminCalls"
        | "warns",
        {
            id: string;
            token: string;
        }
    > = new Map();
    admins: Set<string> = new Set();
    options: {
        adminListSaving: boolean;
        ignoreGlobalPunishments: boolean;
        killstreaks: {
            enabled: boolean;
            countBotKills: boolean;
        };
        automod: boolean;
        name: string;
        host: string;
        port: number;
        password?: string;
    };
    killStreak: KillStreak;
    currentGamemode: string;

    constructor(
        bot: Watchdog,
        options: {
            adminListSaving: boolean;
            ignoreGlobalPunishments: boolean;
            killstreaks: {
                enabled: boolean;
                countBotKills: boolean;
            };
            automod: boolean;
            name: string;
            host: string;
            port: number;
            password?: string;
        }
    ) {
        this.options = options;

        this.bot = bot;

        if (options.killstreaks.enabled)
            this.killStreak = new KillStreak(this, options.name);
    }

    async banUser(
        server: string,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        },
        duration: number,
        reason: string,
        shouldSave: boolean = true
    ) {
        if (!this.connected || !this.authenticated) {
            return `Not ${
                !this.connected ? "connected" : "authenticated"
            } to server`;
        }

        // const bans = (await this.rcon.send("banlist"))
        //     .split("\n")
        //     .map((line) => line.split(", "));
        // const bannedPlayer = bans.find((banned) => banned[0] === player.id);

        // if (bannedPlayer)
        //     return `Player already is banned for ${
        //         bannedPlayer[1] !== "0"
        //             ? pluralize("minute", Number(bannedPlayer[1]), true)
        //             : "PERMANENTLY"
        //     }`;

        let result = await this.rcon.send(
            `ban ${player.id} ${duration || 0} ${reason}`
        );
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }
        // const line = `LogMordhauPlayerController: Display: Admin ${admin.name} (${admin.id}) banned player ${player.id} (Duration: ${duration}, Reason: ${reason})`;
        // const lineDate = new Date();

        if (!shouldSave) return;

        this.bot.logHandler.banHandler.execute(
            server,
            new Date(),
            player,
            admin,
            duration,
            reason
        );
    }

    async unbanUser(
        server: string,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        },
        shouldSave: boolean = true
    ) {
        if (!this.connected || !this.authenticated) {
            return `Not ${
                !this.connected ? "connected" : "authenticated"
            } to server`;
        }

        let result = await this.rcon.send(`unban ${player.id}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }

        // const line = `LogMordhauPlayerController: Display: Admin ${admin.name} (${admin.id}) unbanned player ${player.id}`;
        // const lineDate = new Date();

        if (!shouldSave) return;

        this.bot.logHandler.unbanHandler.execute(
            server,
            new Date(),
            player,
            admin
        );
    }

    async kickUser(
        server: string,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        },
        reason: string,
        shouldSave: boolean = true
    ) {
        if (!this.connected || !this.authenticated) {
            return `Not ${
                !this.connected ? "connected" : "authenticated"
            } to server`;
        }

        let result = await this.rcon.send(`kick ${player.id} ${reason}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("succeeded")) {
            return result;
        }
        // const line = `LogMordhauPlayerController: Display: Admin ${admin.name} (${admin.id}) kicked player ${player.id} (Reason: ${reason})`;
        // const lineDate = new Date();

        // this.bot.logHandler.kickHandler.parse(line, server, lineDate, player);

        if (!shouldSave) return;

        this.bot.logHandler.kickHandler.execute(
            server,
            new Date(),
            player,
            admin,
            null,
            reason
        );
    }

    async muteUser(
        server: string,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        },
        duration: number,
        shouldSave: boolean = true
    ) {
        if (!this.connected || !this.authenticated) {
            return `Not ${
                !this.connected ? "connected" : "authenticated"
            } to server`;
        }

        // const mutes = (await this.rcon.send("mutelist"))
        //     .split("\n")
        //     .map((line) => line.split(", "));
        // const mutedPlayer = mutes.find((muted) => muted[0] === player.id);

        // if (mutedPlayer)
        //     return `Player already is muted for ${
        //         mutedPlayer[1] !== "0"
        //             ? pluralize("minute", Number(mutedPlayer[1]), true)
        //             : "PERMANENTLY"
        //     }`;

        // const res = await rcon.send(`mute 909275ECE8FEDDB 1`);
        // return console.log(res);
        let result = await this.rcon.send(`mute ${player.id} ${duration || 0}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }

        // const line = `LogMordhauPlayerController: Display: Admin ${admin.name} (${admin.id}) muted player ${player.id} (Duration: ${duration})`;
        // const lineDate = new Date();

        if (!shouldSave) return;

        this.bot.logHandler.muteHandler.execute(
            server,
            new Date(),
            player,
            admin,
            duration
        );
    }

    async unmuteUser(
        server: string,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        },
        shouldSave: boolean = true
    ) {
        if (!this.connected || !this.authenticated) {
            return `Not ${
                !this.connected ? "connected" : "authenticated"
            } to server`;
        }

        // const mutes = (await this.rcon.send("mutelist"))
        //     .split("\n")
        //     .map((line) => line.split(", "));
        // const mutedPlayer = mutes.find((muted) => muted[0] === player.id);

        // if (!mutedPlayer) return "Player is not muted";

        // const res = await rcon.send(`mute 909275ECE8FEDDB 1`);
        // return console.log(res);
        let result = await this.rcon.send(`unmute ${player.id}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }

        if (!shouldSave) return;

        this.bot.logHandler.unmuteHandler.execute(
            server,
            new Date(),
            player,
            admin
        );
    }

    async send(message: string) {
        return await this.rcon.send(message);
    }

    async say(message: string) {
        return await this.rcon.send(`say ${message}`);
    }

    async getServerInfo() {
        const [_, name, version, gamemode, currentMap] = (
            await this.rcon.send("info")
        )
            .split("\n")
            .map((stat) => stat.split(": ")[1]);

        return { name, version, gamemode, currentMap };
    }

    async getLeftMatchDuration() {
        const string = (await this.send("getmatchduration")).split("\n")[0];
        const regex = new RegExp(/There are (.+) seconds/);
        const regexParsed = regex.exec(string);
        return parseInt((regexParsed && regexParsed[1]) || "0");
    }

    async getAdmins() {
        return (await this.rcon.send("adminlist"))
            .split("\n")
            .filter(
                (id) =>
                    id.length &&
                    id !== "Not connected" &&
                    id !== "No admins found in admin list"
            );
    }

    async saveAdmins() {
        if (!this.authenticated) return;

        const currentAdminList: Set<string> = new Set();

        (await this.getAdmins()).forEach((adminID) => {
            currentAdminList.add(adminID);
        });

        if (this.initiate || !this.options.adminListSaving) {
            this.admins = currentAdminList;
            return;
        }

        const {
            createdVals: unauthorizedNewAdmins,
            deletedVals: unauthorizedRemovedAdmins,
        } = compareArrayVals([[...this.admins], [...currentAdminList]]);

        if (!unauthorizedNewAdmins && !unauthorizedRemovedAdmins) return;

        if (!config.get("adminListSaving.rollbackAdmins"))
            this.admins = currentAdminList;

        // Unauthorized new admins
        const affectedPlayers: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        }[] = [];
        // Unauthorized removed admins
        const affectedAdmins: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        }[] = [];

        if (unauthorizedNewAdmins?.length) {
            for (let i = 0; i < unauthorizedNewAdmins.length; i++) {
                const adminID = unauthorizedNewAdmins[i];

                if (config.get("adminListSaving.rollbackAdmins"))
                    await this.removeAdmin(adminID);

                affectedPlayers.push(
                    this.bot.cachedPlayers.get(adminID) ||
                        (await LookupPlayer(adminID))
                );
            }

            logger.warn(
                "RCON",
                `Following players: ${
                    affectedPlayers
                        .map(
                            (player) =>
                                `${player.name} (${outputPlayerIDs(
                                    player.ids
                                )})`
                        )
                        .join(", ").length > 900
                        ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                              affectedPlayers
                                  .map(
                                      (player) =>
                                          `${player.name} (${outputPlayerIDs(
                                              player.ids
                                          )})`
                                  )
                                  .join(", ")
                          )})`
                        : affectedPlayers
                              .map(
                                  (player) =>
                                      `${player.name} (${outputPlayerIDs(
                                          player.ids
                                      )})`
                              )
                              .join(", ")
                } was given privileges without permission${
                    config.get("adminListSaving.rollbackAdmins")
                        ? ", they've been removed"
                        : ""
                } (Server: ${this.options.name})`
            );

            sendWebhookMessage(
                this.webhooks.get("activity"),
                `${flatMap(
                    (config.get("discord.roles") as Role[]).filter(
                        (role) => role.receiveMentions
                    ),
                    (role) => role.Ids.map((id) => mentionRole(id))
                )} Following players: ${
                    affectedPlayers
                        .map(
                            (player) =>
                                `${player.name} (${outputPlayerIDs(
                                    player.ids,
                                    true
                                )})`
                        )
                        .join(", ").length > 900
                        ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                              affectedPlayers
                                  .map(
                                      (player) =>
                                          `${player.name} (${outputPlayerIDs(
                                              player.ids
                                          )})`
                                  )
                                  .join(", ")
                          )})`
                        : removeMentions(
                              affectedPlayers
                                  .map(
                                      (player) =>
                                          `${player.name} (${outputPlayerIDs(
                                              player.ids,
                                              true
                                          )})`
                                  )
                                  .join(", ")
                          )
                } was given admin privileges on without permission${
                    config.get("adminListSaving.rollbackAdmins")
                        ? ", they've been removed"
                        : ""
                } (Server: ${this.options.name})`
            );
        }
        if (unauthorizedRemovedAdmins?.length) {
            for (let i = 0; i < unauthorizedRemovedAdmins.length; i++) {
                const adminID = unauthorizedRemovedAdmins[i];

                if (config.get("adminListSaving.rollbackAdmins"))
                    await this.addAdmin(adminID);

                affectedAdmins.push(
                    this.bot.cachedPlayers.get(adminID) ||
                        (await LookupPlayer(adminID))
                );
            }

            logger.warn(
                "RCON",
                `Following admins: ${
                    affectedAdmins
                        .map(
                            (admin) =>
                                `${admin.name} (${outputPlayerIDs(admin.ids)})`
                        )
                        .join(", ").length > 900
                        ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                              affectedAdmins
                                  .map(
                                      (player) =>
                                          `${player.name} (${outputPlayerIDs(
                                              player.ids
                                          )})`
                                  )
                                  .join(", ")
                          )})`
                        : affectedAdmins
                              .map(
                                  (player) =>
                                      `${player.name} (${outputPlayerIDs(
                                          player.ids
                                      )})`
                              )
                              .join(", ")
                } had their privileges removed without permission${
                    config.get("adminListSaving.rollbackAdmins")
                        ? ", they've been added back"
                        : ""
                } (Server: ${this.options.name})`
            );

            sendWebhookMessage(
                this.webhooks.get("activity"),
                `${flatMap(
                    (config.get("discord.roles") as Role[]).filter(
                        (role) => role.receiveMentions
                    ),
                    (role) => role.Ids.map((id) => mentionRole(id))
                )} Following admins: ${
                    affectedAdmins
                        .map(
                            (admin) =>
                                `${admin.name} (${outputPlayerIDs(
                                    admin.ids,
                                    true
                                )})`
                        )
                        .join(", ").length > 900
                        ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                              affectedAdmins
                                  .map(
                                      (admin) =>
                                          `${admin.name} (${outputPlayerIDs(
                                              admin.ids
                                          )})`
                                  )
                                  .join(", ")
                          )})`
                        : removeMentions(
                              affectedAdmins
                                  .map(
                                      (admin) =>
                                          `${admin.name} (${outputPlayerIDs(
                                              admin.ids,
                                              true
                                          )})`
                                  )
                                  .join(", ")
                          )
                }  had their privileges removed without permission${
                    config.get("adminListSaving.rollbackAdmins")
                        ? ", they've been added back"
                        : ""
                } (Server: ${this.options.name})`
            );
        }

        logger.warn("RCON", "Investigate this!");
    }

    async addAdmin(id: string) {
        let res = await this.rcon.send(`addadmin ${id}`);
        res = res.split("\n")[0].trim();
        return res;
    }

    async removeAdmin(id: string) {
        let res = await this.rcon.send(`removeadmin ${id}`);
        res = res.split("\n")[0].trim();
        return res;
    }

    async getBannedPlayers() {
        return (await this.rcon.send("banlist"))
            .split("\n")
            .map((ban) => ban.split(", "));
    }

    async getBannedPlayer(id: string) {
        const bannedPlayer = (await this.getBannedPlayers()).find(
            (ban) => ban[0] === id
        );
        return bannedPlayer && { id, duration: bannedPlayer[1] };
    }

    async getMutedPlayers() {
        return (await this.rcon.send("mutelist"))
            .split("\n")
            .map((ban) => ban.split(", "));
    }

    async getMutedPlayer(id: string) {
        const mutedPlayer = (await this.getMutedPlayers()).find(
            (ban) => ban[0] === id
        );
        return mutedPlayer && { id, duration: mutedPlayer[1] };
    }

    async getIngamePlayers() {
        try {
            return (await this.rcon.send("playerlist"))
                .split("\n")
                .map((p) => {
                    const player = p.split(", ");

                    return { id: player[0], name: player[1] };
                })
                .filter((player) => typeof player.name !== "undefined");
        } catch {
            return [];
        }
    }

    async saveIngamePlayers() {
        (await this.getIngamePlayers()).forEach(async (player) =>
            this.getPlayerToCache(player.id)
        );
    }

    async getIngamePlayer(id: string) {
        return matchSorter(await this.getIngamePlayers(), id, {
            keys: ["id", "name"],
        })[0];

        // return (await this.getIngamePlayers()).find((player) => {
        //     const name = player.name.toLowerCase();
        //     const searchNameSplit = id.split(" ");

        //     return (
        //         player.id === id ||
        //         name.includes(id.toLowerCase()) ||
        //         searchNameSplit.filter((s) => name.includes(s)).length ===
        //             searchNameSplit.length
        //     );
        // });
    }

    async killPlayer(player: {
        ids: { playFabID: string; steamID?: string };
        id: string;
        name?: string;
    }) {
        await this.send(`killplayer ${player.id}`);

        await this.say(`${player.name} has been killed with magic`);
    }

    async getPlayerToCache(id: string) {
        const player = await LookupPlayer(id);
        const data = {
            server: this.options.name,
            ...player,
        };

        this.bot.cachedPlayers.set(id, data);

        return data;
    }

    async updateCache() {
        await this.saveIngamePlayers();

        await this.saveAdmins();
    }

    async onMatchStart() {
        await this.updateCache();

        let message = "";

        if (this.options.killstreaks.enabled) {
            const highestKillstreak = this.killStreak.cache.highestKillstreak;

            if (!highestKillstreak)
                message =
                    "Last match no one had any kills, what a sad gamer moment.";
            else {
                message = `Last match ${highestKillstreak.player.name} had the highest killstreak of ${highestKillstreak.kills}!`;
            }

            this.killStreak.clear();
        }

        if (process.env.NODE_ENV.trim() === "production") {
            // Killstreak related
            if (this.options.killstreaks.enabled) {
                this.killStreak.sendMessage(message);
                this.say(message);
            }

            if (this.options.automod)
                this.say(
                    `AutoMod: This server has an AutoMod, usage of profane language will lead to mutes and bans.`
                );
            if (this.options.killstreaks.enabled)
                this.say(`Killstreak: Killstreaks has been enabled.`);
            const { gamemode } = await this.getServerInfo();
            if (gamemode === "Deathmatch") {
                const leftMatchDuration = await this.getLeftMatchDuration();
                this.say(
                    `Match ends ${formatDistanceToNow(
                        addSeconds(new Date(), leftMatchDuration),
                        { addSuffix: true }
                    )}`
                );
            }
        }
    }

    // async onMatchChangeMap() {
    //     const { gamemode } = await this.getServerInfo();

    //     if (
    //         (this.currentGamemode === "Horde" || gamemode === "Horde") &&
    //         gamemode !== this.currentGamemode
    //     ) {
    //         // For horde
    //         await this.rcon.send("listen scorefeed");
    //     }

    //     this.currentGamemode = gamemode;
    // }

    async onJoin(id: string) {
        const server = this.options.name;

        const player = this.bot.requestingPlayers.get(id) || {
            server,
            ...(await this.getPlayerToCache(id)),
        };

        const admin = this.admins.has(player.id);

        this.bot.cachedPlayers.set(player.id, {
            ...this.bot.cachedPlayers.get(player.id),
            ...deepClean(player),
            server,
        });

        // const isBanned = await this.getBannedPlayer(id);

        // if (isBanned) {
        //     logger.info(
        //         "Server",
        //         `${admin ? "Admin" : "Player"} ${
        //             player.name
        //         } (${outputPlayerIDs(
        //             player.ids
        //         )}) tried to join but is banned (Duration: ${
        //             isBanned.duration === "0"
        //                 ? "Permanent"
        //                 : `${pluralize(
        //                       "minute",
        //                       Number(isBanned.duration),
        //                       true
        //                   )} (unbanned ${formatDistanceToNow(
        //                       addMinutes(
        //                           new Date(),
        //                           parseInt(isBanned.duration)
        //                       ),
        //                       { addSuffix: true }
        //                   )})`
        //         }, Server: ${server})`
        //     );

        //     if (process.env.NODE_ENV.trim() === "production")
        //         sendWebhookMessage(
        //             config.discord.webhookEndpoints.activity,
        //             `${admin ? "Admin" : "Player"} ${
        //                 player.name
        //             } (${outputPlayerIDs(
        //                 player.ids,
        //                 true
        //             )}) tried to join but is banned (Duration: ${
        //                 isBanned.duration === "0"
        //                     ? "Permanent"
        //                     : `${pluralize(
        //                           "minute",
        //                           Number(isBanned.duration),
        //                           true
        //                       )} (unbanned ${formatDistanceToNow(
        //                           addMinutes(
        //                               new Date(),
        //                               parseInt(isBanned.duration)
        //                           ),
        //                           { addSuffix: true }
        //                       )})`
        //             }, Server: ${server})`
        //         );

        //     return;
        // }

        const history = (
            await this.bot.database.getPlayerHistory([
                player.ids.playFabID,
                player.ids.steamID,
            ])
        ).history;

        const bans = history.filter((log) => log.type === "BAN").length;
        const totalDuration = history
            .filter((h) => h.duration)
            .reduce((a, b) => a + b.duration, 0);

        logger.info(
            "Server",
            `${admin ? "Admin" : "Player"} ${player.name} (${outputPlayerIDs(
                player.ids
            )}) has joined the server (Server: ${server}${
                bans > 0
                    ? `, Bans: ${bans}, Total Duration: ${pluralize(
                          "minute",
                          Number(totalDuration),
                          true
                      )}`
                    : ""
            })`
        );

        if (process.env.NODE_ENV.trim() === "production")
            sendWebhookMessage(
                this.webhooks.get("activity"),
                `${admin ? "Admin" : "Player"} ${removeMentions(
                    player.name
                )} (${outputPlayerIDs(
                    player.ids,
                    true
                )}) has joined the server (Server: ${server}${
                    bans > 0
                        ? `, Bans: ${bans}, Total Duration: ${pluralize(
                              "minute",
                              Number(totalDuration),
                              true
                          )}`
                        : ""
                })`
            );

        if (bans < 3) return;

        if (!this.bot.naughtyPlayers.has(player.id)) {
            this.bot.naughtyPlayers.set(
                player.id,
                this.bot.cachedPlayers.get(player.id) ||
                    (await this.getPlayerToCache(player.id))
            );
        }

        logger.info(
            "Server",
            `Naughty ${admin ? "admin" : "player"} ${
                player.name
            } (${outputPlayerIDs(
                player.ids
            )}) has joined with ${bans} bans a total duration of ${pluralize(
                "minute",
                Number(totalDuration),
                true
            )} (Server: ${server})`
        );

        if (process.env.NODE_ENV.trim() === "production")
            sendWebhookMessage(
                this.webhooks.get("wanted"),
                `Naughty ${admin ? "admin" : "player"} ${removeMentions(
                    player.name
                )} (${outputPlayerIDs(
                    player.ids,
                    true
                )}) has joined with ${bans} bans a total duration of ${pluralize(
                    "minute",
                    Number(totalDuration),
                    true
                )} (Server: ${server})`
            );
    }

    async onLeave(id: string) {
        const server = this.options.name;
        const player =
            this.bot.cachedPlayers.get(id) || (await this.getPlayerToCache(id));
        const admin = this.admins.has(player.id);
        const punishedPlayer = this.bot.punishedPlayers.get(player.id);

        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);

        this.bot.punishedPlayers.del(player.id);
        this.bot.naughtyPlayers.del(player.id);

        if (punishedPlayer) {
            logger.info(
                "Server",
                `${admin ? "Admin" : "Player"} ${
                    player.name
                } (${outputPlayerIDs(player.ids)}) has been punished (Type: ${
                    punishedPlayer.punishment
                }, Admin: ${punishedPlayer.admin.name}, Server: ${server})`
            );

            if (process.env.NODE_ENV.trim() === "production") {
                sendWebhookMessage(
                    this.webhooks.get("activity"),
                    `${admin ? "Admin" : "Player"} ${removeMentions(
                        player.name
                    )} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}) has been punished (Type: ${
                        punishedPlayer.punishment
                    }, Admin: ${punishedPlayer.admin.name}, Server: ${server})`
                );
            }
        } else {
            // const isBanned = await this.getBannedPlayer(player.id);
            // if (isBanned) return;

            logger.info(
                "Server",
                `${admin ? "Admin" : "Player"} ${
                    player.name
                } (${outputPlayerIDs(
                    player.ids
                )}) has left the server (Server: ${server})`
            );

            if (process.env.NODE_ENV.trim() === "production") {
                sendWebhookMessage(
                    this.webhooks.get("activity"),
                    `${admin ? "Admin" : "Player"} ${removeMentions(
                        player.name
                    )} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}) has left the server (Server: ${server})`
                );
            }
        }

        const naughtyPlayer = this.bot.naughtyPlayers.has(player.id);

        if (naughtyPlayer) {
            if (process.env.NODE_ENV.trim() === "production") {
                if (!punishedPlayer) {
                    logger.info(
                        "Server",
                        `Naughty ${admin ? "admin" : "player"} ${
                            player.name
                        } (${outputPlayerIDs(
                            player.ids
                        )}) left the server (Server: ${server})`
                    );

                    sendWebhookMessage(
                        this.webhooks.get("wanted"),
                        `Naughty ${admin ? "admin" : "player"} ${removeMentions(
                            player.name
                        )} (${outputPlayerIDs(
                            player.ids,
                            true
                        )}) left the server (Server: ${server})`
                    );
                } else {
                    logger.info(
                        "Server",
                        `Naughty ${admin ? "admin" : "player"} ${
                            player.name
                        } (${outputPlayerIDs(
                            player.ids
                        )}) has been punished (Type: ${
                            punishedPlayer.punishment
                        }, Admin: ${
                            punishedPlayer.admin.name
                        }, Server: ${server})`
                    );

                    sendWebhookMessage(
                        this.webhooks.get("wanted"),
                        `Naughty ${admin ? "admin" : "player"} ${removeMentions(
                            player.name
                        )} (${outputPlayerIDs(
                            player.ids,
                            true
                        )}) has been punished (Type: ${
                            punishedPlayer.punishment
                        }, Admin: ${removeMentions(
                            punishedPlayer.admin.name
                        )}, Server: ${server})`
                    );
                }
            }
        }
    }

    async onPunishment(
        adminID: string,
        playerID: string,
        date: Date,
        punishment: string,
        duration?: number,
        reason?: string
    ) {
        // this.bot.logHandler.read(this.bot, ``, this.options.name)

        // if (process.env.NODE_ENV.trim() === "development") return;

        const admin =
            this.bot.cachedPlayers.get(adminID) ||
            (await this.getPlayerToCache(adminID));
        const player =
            this.bot.cachedPlayers.get(playerID) ||
            (await this.getPlayerToCache(playerID));

        if (this.options.adminListSaving && !this.admins.has(adminID)) {
            await this.saveAdmins();

            sendWebhookMessage(
                this.webhooks.get("activity"),
                `Unauthorized admin ${removeMentions(
                    admin.name
                )} (${outputPlayerIDs(
                    admin.ids,
                    true
                )}) ${punishment} ${removeMentions(
                    player.name
                )} (${outputPlayerIDs(player.ids, true)})${
                    ["banned", "muted"].includes(punishment)
                        ? " and the punishment has beeen reverted"
                        : ""
                }`
            );

            switch (punishment) {
                case "banned": {
                    this.unbanUser(
                        this.options.name,
                        {
                            ids: { playFabID: "", steamID: "" },
                            id: "",
                            name: "",
                        },
                        player,
                        false
                    );
                }
                case "muted": {
                    this.unmuteUser(
                        this.options.name,
                        {
                            ids: { playFabID: "", steamID: "" },
                            id: "",
                            name: "",
                        },
                        player,
                        false
                    );
                }
            }

            return;
        }

        // console.log(
        //     `An admin ${duration === 0 ? "permanently " : ""}${punishment} ${
        //         player.name
        //     }${
        //         typeof duration === "number" && duration !== 0
        //             ? ` for ${pluralize("minute", duration, true)}`
        //             : ""
        //     }`
        // );

        // this.say(
        //     `An admin ${duration === 0 ? "permanently " : ""}${punishment} ${
        //         player.name
        //     }${
        //         typeof duration === "number" && duration !== 0
        //             ? ` for ${pluralize("minute", duration, true)}`
        //             : ""
        //     }`
        // );

        // const line = `LogMordhauPlayerController: Display: Admin ${admin.name} (${admin.id}) ${punishment} player ${player.id} (Duration: ${duration}, Reason: ${reason})`;
        // const lineDate = new Date();

        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);

        this.bot.punishedPlayers.del(player.id);
        this.bot.naughtyPlayers.del(player.id);

        switch (punishment) {
            case "kicked": {
                return this.bot.logHandler.kickHandler.execute(
                    this.options.name,
                    date,
                    player,
                    admin,
                    duration,
                    reason
                );
            }
            case "banned": {
                if (config.get("syncServerPunishments"))
                    return this.bot.rcon.globalBan(
                        admin,
                        player,
                        duration,
                        reason,
                        this.options.name
                    );

                return this.bot.logHandler.banHandler.execute(
                    this.options.name,
                    date,
                    player,
                    admin,
                    duration,
                    reason
                );
            }
            case "unbanned": {
                if (config.get("syncServerPunishments"))
                    return this.bot.rcon.globalUnban(
                        admin,
                        player,
                        this.options.name
                    );

                return this.bot.logHandler.unbanHandler.execute(
                    this.options.name,
                    date,
                    player,
                    admin
                );
            }
            case "muted": {
                if (config.get("syncServerPunishments"))
                    return this.bot.rcon.globalMute(
                        admin,
                        player,
                        duration,
                        this.options.name
                    );

                return this.bot.logHandler.muteHandler.execute(
                    this.options.name,
                    date,
                    player,
                    admin,
                    duration
                );
            }
            case "unmuted": {
                if (config.get("syncServerPunishments"))
                    return this.bot.rcon.globalUnmute(
                        admin,
                        player,
                        this.options.name
                    );

                return this.bot.logHandler.unmuteHandler.execute(
                    this.options.name,
                    date,
                    player,
                    admin
                );
            }
        }
    }
    async onKill(winnerID: string, loserID: string) {
        const winner = this.bot.cachedPlayers.get(winnerID) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(winnerID)),
        };
        const loser = this.bot.cachedPlayers.get(loserID) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(loserID)),
        };

        // if (process.env.NODE_ENV.trim() === "production") {
        //     await this.checkPlayerExistsOrCreate(winnerID);
        //     this.bot.leaderboards.addKills(winner);
        //     await this.checkPlayerExistsOrCreate(loserID);
        //     this.bot.leaderboards.addDeaths(loser);
        // }

        if (this.options.killstreaks.enabled)
            this.killStreak.check(winner, loser);
    }

    async onSuicide(id: string) {
        const player = this.bot.cachedPlayers.get(id) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(id)),
        };
        if (!player) return;

        // if (process.env.NODE_ENV.trim() === "production") {
        //     await this.checkPlayerExistsOrCreate(player);
        //     this.bot.leaderboards.addDeaths(player);
        // }

        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);
    }

    async reconnect() {
        if (this.reconnecting) return;

        logger.info(
            "RCON",
            `Trying to reconnect (Server: ${this.options.name})`
        );

        this.reconnecting = true;

        setTimeout(async () => {
            try {
                await this.rcon.connect();
            } catch (error) {
                if (this.rcon.socket) this.rcon.socket.destroy();
            }

            this.reconnecting = false;

            if (!this.rcon.socket || !this.connected) await this.reconnect();
        }, 2500);
    }

    async initialize() {
        this.rcon = new RconClient({
            host: this.options.host,
            port: this.options.port,
            password: this.options.password,
            timeout: 999999999,
        });

        this.rcon.on("connect", () => {
            this.connected = true;

            logger.info(
                "RCON",
                `Connection success (Server: ${this.options.name})`
            );
        });
        this.rcon.on("authenticated", async () => {
            this.authenticated = true;

            logger.info("RCON", `Auth success (Server: ${this.options.name})`);

            await this.rcon.send("listen chat");
            await this.rcon.send("listen matchstate");
            await this.rcon.send("listen killfeed");
            await this.rcon.send("listen login");
            await this.rcon.send("listen punishment");

            // const { gamemode } = await this.getServerInfo();
            // this.currentGamemode = gamemode;
            // // To make horde killstreak work
            // if (gamemode === "Horde") await this.rcon.send("listen scorefeed");

            await this.updateCache();

            this.rcon.socket.once("end", async () => {
                this.connected = false;
                this.authenticated = false;

                logger.info(
                    "RCON",
                    `Disconnected from server (Server: ${this.options.name})`
                );

                await this.reconnect();
            });

            this.initiate = false;
        });
        this.rcon.on("end", async () => {
            this.connected = false;
            this.authenticated = false;

            logger.info(
                "RCON",
                `Disconnected from server (Server: ${this.options.name})`
            );

            await this.reconnect();
        });
        this.rcon.on("error", (error) => {
            logger.error(
                "RCON",
                `An error occurred (Error: ${error.message || error}, Server: ${
                    this.options.name
                })`
            );
        });

        this.rcon.on("broadcast", async (data: string) => {
            logger.debug(
                "RCON Broadcast",
                `${data} (Server: ${this.options.name})`
            );

            if (data.startsWith("Login:")) {
                if (data.endsWith("logged in")) {
                    // Rebus34 (8DB047B901A3A6D0) logged in
                    const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                    const regexParsed = regex.exec(data);

                    if (!regexParsed) {
                        logger.error(
                            "Bot",
                            `Failed to parse the regex for join ${data}`
                        );
                        return;
                    }

                    const id = regexParsed[2];

                    this.onJoin(id);
                }
                if (data.endsWith("logged out")) {
                    // Rebus34 (8DB047B901A3A6D0) logged out
                    const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                    const regexParsed = regex.exec(data);

                    if (!regexParsed) {
                        logger.error(
                            "Bot",
                            `Failed to parse the regex for leave ${data}`
                        );
                        return;
                    }

                    const id = regexParsed[2];

                    this.onLeave(id);
                }
            }

            if (data.startsWith("Punishment: Admin")) {
                // const punishment = data.split(" ")[1].toLowerCase();

                // if (punishment === "kick" && ) return;

                // // Punishment: Unbanned PlayFab ID F3C1C9138FE88F1A
                // const s = data.split(" (");
                // const message = s[s.length - 2].replace(")", "").split(" ");
                // const adminID = message[0];
                // const playerID = message[message.length - 1];

                // // if (message.includes("failed")) return;

                // const punishment = message[message.length - 3];
                // const duration = parseInt(data.split(": ")[2]?.split(", ")[0]);
                // const reason = data.split(": ")[3];
                // console.log("reason", data.split(": "));

                // console.log(s, s[s.length - 2].replace(")", ""));

                const string = data.replace("Punishment: Admin", "");
                const d = string.match(/(.*)player(.*)/);
                const s1 = d[1].split(" ");
                const s2 = d[2].split(" ");
                const punishment = s1[s1.length - 2];
                const adminID = s1[s1.length - 3].replace(/\(|\)/g, "");
                const playerID = s2[1];
                const duration = parseInt(
                    string.split(": ")[1]?.split(", ")[0].replace(")", "")
                );
                const reason = string.split(": ")[2]?.replace(")", "");

                if (d[1].includes("failed")) return;

                // console.log(punishment, adminID, playerID, duration, reason);
                // console.log(adminID, playerID);
                // console.log(punishment, duration, reason);

                if (
                    punishment === "kicked" &&
                    (reason === "Vote kick." || reason === "Server is full.")
                )
                    return;

                this.onPunishment(
                    adminID,
                    playerID,
                    new Date(),
                    punishment,
                    duration,
                    reason
                );
            }

            // Chat logs

            // Commands
            if (data.startsWith("Chat:")) {
                const line = data
                    .split(": ")[1]
                    .split(", ")
                    .map((string: string) => string.trim());

                const id = line[0];
                let message = line.slice(2).join(" ");
                message = message.substr(
                    message.indexOf(")") + 2,
                    message.length
                );

                const player = this.bot.cachedPlayers.get(id) || {
                    server: this.options.name,
                    ...(await this.getPlayerToCache(id)),
                };
                if (!player) return;

                // if (process.env.NODE_ENV.trim() === "production") {
                const admin = this.admins.has(player.id);

                await sendWebhookMessage(
                    this.webhooks.get("chat"),
                    `${admin ? "Admin" : "Player"} ${removeMentions(
                        player.name
                    )} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}): \`${message}\` (Server: ${this.options.name})`
                );

                if (this.options.automod)
                    await this.bot.antiSlur.check(this, player, message);
                // }

                if (!message.startsWith(config.get("ingamePrefix"))) return;

                const args = message
                    .slice(config.get("ingamePrefix").length)
                    .trim()
                    .split(/ +/);

                const commandName = args.shift().toLowerCase();
                const command = this.bot.RCONCommands.find((c) =>
                    [c.meta.name, ...c.meta.aliases].includes(commandName)
                );

                if (!command) return;
                if (command.meta.adminsOnly && !this.admins.has(id))
                    return this.say("Permission denied");
                if (
                    !config
                        .get("servers")
                        .find((server) => server.name === this.options.name)
                        .rcon.ingameCommands.includes(command.meta.name)
                )
                    return;

                logger.info(
                    "Ingame Command",
                    `${player.name} ran ${command.meta.name}`
                );

                command.execute(
                    new RCONCommandContext(
                        command,
                        this.bot,
                        this,
                        player,
                        message,
                        args
                    )
                );
            }

            // Match start
            if (data.includes("MatchState: In progress")) {
                this.onMatchStart();
            }

            // // Match change map
            // if (data.includes("MatchState: Leaving map")) {
            //     this.onMatchChangeMap();
            // }

            // // Match change map
            // if (data.includes("Scorefeed: ") && data.includes("100.0")) {
            //     const s = data.replace(
            //         /(?<=\()(?:[^()]+|\([^)]+\))+|\)| \(/g,
            //         ""
            //     );
            //     const id = s.split("'")[0].split(" ")[2];
            //     const pointsGained = s.split("by ")[1].split(" ")[0];

            //     // Assuming 100.0 equals 1 kill
            //     if (pointsGained !== "100.0") return;

            //     const player = this.bot.cachedPlayers.get(id) || {
            //         server: this.options.name,
            //         ...(await this.getPlayerToCache(id)),
            //     };

            //     if (this.options.killstreaks.enabled)
            //         this.killStreak.check(player, { id: "", name: "" });
            // }

            // Killstreaker?
            if (data.includes("Killfeed:") && data.includes("killed")) {
                function parseMessage(
                    message: string
                ): { winnerID: string; loserID: string } | null {
                    // 909275ECE8FEDDB ([NFD] Schweppes) killed 7443E1C34D59DDEC (]ppp[ Rift)
                    // const regex = new RegExp(/(.+) \(.+\) killed (.+) \(.+\)/g);
                    // const regexParsed = regex.exec(message);

                    // if (!regexParsed) {
                    //     logger.error(
                    //         "Bot",
                    //         `Failed to parse the regex for killstreak ${message}`
                    //     );
                    //     return;
                    // }

                    // const winnerID = regexParsed[1];
                    // const loserID = regexParsed[2];

                    const modifiedMessage = message
                        .replace(/(?<=\()(?:[^()]+|\([^)]+\))+|\)| \(/g, "")
                        .split(" killed ");

                    const winnerID = modifiedMessage[0];
                    const loserID = modifiedMessage[1];

                    if (!winnerID || !loserID) return;

                    return {
                        winnerID,
                        loserID,
                    };
                }

                const message = data.split(": ")[2];
                if (!message) return;

                const killFeed = parseMessage(message);

                if (!killFeed) return;

                this.onKill(killFeed.winnerID, killFeed.loserID);
            } else if (
                data.includes("Killfeed:") &&
                data.includes("committed suicide")
            ) {
                function parseMessage(message: string): string | null {
                    // 909275ECE8FEDDB ([NFD] Schweppes) killed 7443E1C34D59DDEC (]ppp[ Rift)
                    // const regex = new RegExp(/(.+) \(.+\) committed suicide/g);
                    // const regexParsed = regex.exec(message);

                    // if (!regexParsed) {
                    //     logger.error(
                    //         "Bot",
                    //         `Failed to parse the regex for killstreak suicide ${message}`
                    //     );
                    //     return;
                    // }

                    // const playerID = regexParsed[1];

                    const modifiedMessage = message
                        .replace(/(?<=\()(?:[^()]+|\([^)]+\))+|\)| \(/g, "")
                        .split(" ");

                    const playerID = modifiedMessage[0];

                    return playerID;
                }

                const message = data.split(": ")[2];
                if (!message) return;

                const playerID = parseMessage(message);

                this.onSuicide(playerID);
            }
        });

        clearInterval(this.keepAlive);

        this.keepAlive = setInterval(() => {
            this.send("alive")
                .then(() => {
                    // if (admins.includes("Not connected"))
                    //     throw new Error("Not connected");

                    logger.debug(
                        "RCON",
                        `Keepalive success (Server: ${this.options.name})`
                    );
                })
                .catch(async (err) => {
                    logger.error(
                        "RCON",
                        `Keepalive failed (Error: ${
                            err.stack || err
                        }, Server: ${this.options.name})`
                    );

                    await this.reconnect();
                })
                .finally(() => this.saveAdmins());
        }, 30000);

        try {
            await this.rcon.connect();
        } catch (error) {
            logger.error(
                "RCON",
                `An error occurred while connecting (Error: ${
                    error.message || error
                }, Server: ${this.options.name})`
            );

            await this.reconnect();
        }
    }
}
