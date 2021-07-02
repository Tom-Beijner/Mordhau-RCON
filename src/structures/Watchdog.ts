import flatMap from "array.prototype.flatmap";
import Eris, { Client } from "eris";
import LRU from "lru-cache";
import path, { resolve as res } from "path";
import pluralize from "pluralize";
import { GatewayServer, SlashCreator } from "slash-create";
import { walk } from "walk";
import LogHandler from "../handlers/logHandler";
import { mentionRole, sendWebhookMessage } from "../services/Discord";
import { CreateAccount, Login } from "../services/PlayFab";
import config, { Role } from "../structures/Config";
import logger from "../utils/logger";
import MordhauAPI from "../utils/MordhauAPI";
import { outputPlayerIDs } from "../utils/PlayerID";
import AntiSlur from "./AutoMod";
import AutoUpdater from "./AutoUpdater";
import BaseRCONCommand from "./BaseRCONCommands";
import Database from "./Database";
import Rcon from "./Rcon";

interface Iids {
    playFabID: string;
    entityID: string;
    steamID: string;
}

export default class Watchdog {
    private client: Client;
    private token: string;
    public startTime: number = Date.now();
    public autoUpdater: AutoUpdater;
    public RCONCommands: BaseRCONCommand[] = [];
    public database: Database;
    public slashCreator: SlashCreator;
    public owners: string[];
    public servers: Map<
        string,
        {
            rcon: Rcon;
            name: string;
        }
    > = new Map();
    public mordhau = MordhauAPI;
    public antiSlur: AntiSlur;

    public requestingPlayers: LRU<
        string,
        {
            server: string;
            ids: Iids;
            id: string;
            name: string;
        }
    >;

    // Basically a lagged current players list
    public cachedPlayers: LRU<
        string,
        {
            server: string;
            ids: Iids;
            id: string;
            name: string;
        }
    >;
    public naughtyPlayers: LRU<
        string,
        { ids: Iids; id: string; name?: string }
    >;
    public punishedPlayers: LRU<
        string,
        {
            punishment: string;
            admin: {
                ids: { playFabID: string; steamID?: string };
                id: string;
                name?: string;
            };
        }
    >;

    public logHandler: LogHandler;
    public rcon = {
        getServersInfo: async () => {
            const results: {
                server: string;
                data: {
                    name: string;
                    version: string;
                    gamemode: string;
                    currentMap: string;
                    leftMatchDuration: number;
                };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                const { name, version, gamemode, currentMap } =
                    await server.rcon.getServerInfo();
                const leftMatchDuration =
                    await server.rcon.getLeftMatchDuration();

                results.push({
                    server: serverName,
                    data: {
                        name,
                        version,
                        gamemode,
                        currentMap,
                        leftMatchDuration,
                    },
                });
            }

            return results;
        },
        getServersStats: async () => {
            const results: {
                server: string;
                data: {
                    minTickRate: string;
                    maxTickRate: string;
                    avgTickRate: string;
                };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                const [minTickRate, maxTickRate, avgTickRate] = (
                    await server.rcon.send("stats")
                )
                    .split("\n")
                    .map((tickRate) => tickRate.split(": ")[1]);

                results.push({
                    server: serverName,
                    data: {
                        minTickRate,
                        maxTickRate,
                        avgTickRate,
                    },
                });
            }

            return results;
        },
        getIngamePlayers: async () => {
            const results: {
                server: string;
                players: { id: string; name: string }[];
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (!server.rcon.connected || !server.rcon.authenticated)
                    continue;

                const players = await server.rcon.getIngamePlayers();

                results.push({
                    server: serverName,
                    players,
                });
            }

            return results;
        },
        getIngamePlayer: async (id: string) => {
            const results: {
                server: string;
                id: string;
                name: string;
            }[] = [];

            for (const [serverName, server] of this.servers) {
                const player = await server.rcon.getIngamePlayer(id);
                if (!player) continue;

                results.push({
                    server: serverName,
                    id: player.id,
                    name: player.name,
                });
            }

            return results[0];
        },
        getMutedPlayer: async (id: string) => {
            const results: {
                server: string;
                data: { id: string; duration: string };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                const player = await server.rcon.getMutedPlayer(id);
                if (!player) continue;

                results.push({
                    server: serverName,
                    data: player,
                });
            }

            return results;
        },
        getBannedPlayer: async (id: string) => {
            const results: {
                server: string;
                data: { id: string; duration: string };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                const player = await server.rcon.getBannedPlayer(id);
                if (!player) continue;

                results.push({
                    server: serverName,
                    data: player,
                });
            }

            return results;
        },
        getKillstreaks: () => {
            const results: {
                server: string;
                data: Map<
                    string,
                    { player: { id: string; name: string }; kills: number }
                >;
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (!server.rcon.options.killstreaks) continue;

                results.push({
                    server: serverName,
                    data: server.rcon.killStreak.cache.players,
                });
            }

            return results;
        },
        getHighestKillstreaks: () => {
            const results: {
                server: string;
                data: { player: { id: string; name: string }; kills: number };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    !server.rcon.options.killstreaks ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                )
                    continue;

                results.push({
                    server: serverName,
                    data: server.rcon.killStreak.cache.highestKillstreak,
                });
            }

            return results;
        },
        globalBan: async (
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
            duration?: number,
            reason?: string
        ) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    server.rcon.options.ignoreGlobalPunishments ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: server.rcon.options.ignoreGlobalPunishments
                                ? "Ignores global punishments"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                const bannedPlayer = await server.rcon.getBannedPlayer(
                    player.id
                );

                if (bannedPlayer) {
                    if (Number(bannedPlayer.duration) === 0) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: "Player is currently permanently banned",
                                failed: true,
                            },
                        });

                        continue;
                    }

                    await server.rcon.send(`unban ${player.id}`);
                }

                // if (bannedPlayer) {
                //     servers.push({
                //         name: serverName,
                //         data: {
                //             result: `Player already is banned ${
                //                 bannedPlayer[1] !== "0"
                //                     ? `for ${pluralize(
                //                           "minute",
                //                           Number(bannedPlayer.duration),
                //                           true
                //                       )}`
                //                     : "PERMANENTLY"
                //             }`,
                //             failed: true,
                //         },
                //     });

                //     continue;
                // }

                let result = await server.rcon.send(
                    `ban ${player.id} ${duration || 0} ${reason}`
                );
                result = result.split("\n")[0].trim();

                if (!result.includes("processed successfully")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            if (
                this.servers.size &&
                this.servers.size !==
                    servers.filter((server) => server.data.failed).length
            ) {
                await this.logHandler.banHandler.execute(
                    "Global",
                    new Date(),
                    player,
                    admin,
                    duration,
                    reason,
                    true
                );
            }

            return servers;
        },
        globalMute: async (
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
            duration?: number
        ) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    server.rcon.options.ignoreGlobalPunishments ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: server.rcon.options.ignoreGlobalPunishments
                                ? "Ignores global punishments"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                const mutedPlayer = await server.rcon.getMutedPlayer(player.id);

                if (mutedPlayer) {
                    if (Number(mutedPlayer.duration) === 0) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: "Player is currently permanently muted",
                                failed: true,
                            },
                        });

                        continue;
                    }

                    await server.rcon.send(`unmute ${player.id}`);
                }

                // if (mutedPlayer) {
                //     servers.push({
                //         name: serverName,
                //         data: {
                //             result: `Player already is muted ${
                //                 mutedPlayer.duration !== "0"
                //                     ? `for ${pluralize(
                //                           "minute",
                //                           Number(mutedPlayer.duration),
                //                           true
                //                       )}`
                //                     : "PERMANENTLY"
                //             }`,
                //             failed: true,
                //         },
                //     });

                //     continue;
                // }

                let result = await server.rcon.send(
                    `mute ${player.id} ${duration || 0}`
                );
                result = result.split("\n")[0].trim();

                if (!result.includes("processed successfully")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            if (
                this.servers.size &&
                this.servers.size !==
                    servers.filter((server) => server.data.failed).length
            ) {
                await this.logHandler.muteHandler.execute(
                    "Global",
                    new Date(),
                    player,
                    admin,
                    duration,
                    null,
                    true
                );
            }

            return servers;
        },
        globalUnban: async (
            admin: {
                ids: { playFabID: string; steamID?: string };
                id: string;
                name?: string;
            },
            player: {
                ids: { playFabID: string; steamID: string };
                id: string;
                name?: string;
            }
        ) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    server.rcon.options.ignoreGlobalPunishments ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: server.rcon.options.ignoreGlobalPunishments
                                ? "Ignores global punishments"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                // const bannedPlayer = await server.rcon.getBannedPlayer(
                //     player.id
                // );

                // if (!bannedPlayer) {
                //     servers.push({
                //         name: serverName,
                //         data: {
                //             result: "Player is not banned",
                //             failed: true,
                //         },
                //     });

                //     continue;
                // }

                let result = await server.rcon.send(`unban ${player.id}`);
                result = result.split("\n")[0].trim();

                if (!result.includes("processed successfully")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            if (
                this.servers.size &&
                this.servers.size !==
                    servers.filter((server) => server.data.failed).length
            ) {
                await this.logHandler.unbanHandler.execute(
                    "Global",
                    new Date(),
                    player,
                    admin,
                    null,
                    null,
                    true
                );
            }

            return servers;
        },
        globalUnmute: async (
            admin: {
                ids: { playFabID: string; steamID?: string };
                id: string;
                name?: string;
            },
            player: {
                ids: { playFabID: string; steamID: string };
                id: string;
                name?: string;
            }
        ) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    server.rcon.options.ignoreGlobalPunishments ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: server.rcon.options.ignoreGlobalPunishments
                                ? "Ignores global punishments"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                // const mutedPlayer = await server.rcon.getMutedPlayer(player.id);

                // if (!mutedPlayer) {
                //     servers.push({
                //         name: serverName,
                //         data: {
                //             result: "Player is not muted",
                //             failed: true,
                //         },
                //     });

                //     continue;
                // }

                let result = await server.rcon.send(`unmute ${player.id}`);
                result = result.split("\n")[0].trim();

                if (!result.includes("processed successfully")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            if (
                this.servers.size &&
                this.servers.size !==
                    servers.filter((server) => server.data.failed).length
            ) {
                await this.logHandler.unmuteHandler.execute(
                    "Global",
                    new Date(),
                    player,
                    admin,
                    null,
                    null,
                    true
                );
            }

            return servers;
        },
        globalAddAdmin: async (player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        }) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    server.rcon.admins.has(player.id) ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: server.rcon.admins.has(player.id)
                                ? "Already an admin"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                server.rcon.admins.add(player.id);

                let result = await server.rcon.send(`addadmin ${player.id}`);
                result = result.split("\n")[0].trim();

                if (!result.includes("is now an admin")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                sendWebhookMessage(
                    server.rcon.webhooks.get("activity"),
                    `${flatMap(
                        (config.get("discord.roles") as Role[]).filter(
                            (role) => role.receiveMentions
                        ),
                        (role) => role.Ids.map((id) => mentionRole(id))
                    )} ${player.name} (${outputPlayerIDs(
                        player.ids,
                        true
                    )})) was given admin privileges (Reason: Global Add Admin)`
                );

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            return servers;
        },
        globalRemoveAdmin: async (player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        }) => {
            const servers: {
                name: string;
                data: { result: string; failed: boolean };
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (
                    !server.rcon.admins.has(player.id) ||
                    !server.rcon.connected ||
                    !server.rcon.authenticated
                ) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: !server.rcon.admins.has(player.id)
                                ? "Not an admin"
                                : `Not ${
                                      !server.rcon.connected
                                          ? "connected"
                                          : "authenticated"
                                  } to server`,
                            failed: true,
                        },
                    });

                    continue;
                }

                server.rcon.admins.delete(player.id);

                let result = await server.rcon.send(`removeadmin ${player.id}`);
                result = result.split("\n")[0].trim();
                console.log(result);
                if (!result.includes("is no longer an admin")) {
                    servers.push({
                        name: serverName,
                        data: {
                            result: result,
                            failed: true,
                        },
                    });

                    continue;
                }

                sendWebhookMessage(
                    server.rcon.webhooks.get("activity"),
                    `${flatMap(
                        (config.get("discord.roles") as Role[]).filter(
                            (role) => role.receiveMentions
                        ),
                        (role) => role.Ids.map((id) => mentionRole(id))
                    )} ${player.name} (${outputPlayerIDs(
                        player.ids,
                        true
                    )})) had their admin privileges removed (Reason: Global Remove Admin)`
                );

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            return servers;
        },
    };

    constructor(
        token: string
        // rconOptions: { host: string; port: number; password: string }
    ) {
        this.client = Eris(token, {
            disableEvents: {
                GUILD_BAN_ADD: true,
                GUILD_BAN_REMOVE: true,
                MESSAGE_DELETE: true,
                MESSAGE_DELETE_BULK: true,
                MESSAGE_UPDATE: true,
                TYPING_START: true,
                VOICE_STATE_UPDATE: true,
            },
            messageLimit: 10,
        });

        this.token = token;

        this.autoUpdater = new AutoUpdater({
            repository: "Tom-Beijner/Mordhau-RCON",
            branch: "master",
            ignoredFiles: ["src/locales/bannedWords.json"],
            downloadSubdirectory: "repo",
            backupSubdirectory: "backup",
            autoUpdateInterval: config.get("autoUpdate.checkInterval"),
        });

        this.launch();
    }

    public setCacheMaxSize(servers: number) {
        this.requestingPlayers.max = 70 * servers;
        this.cachedPlayers.max = 70 * servers;
        this.naughtyPlayers.max = 40 * servers;
        this.punishedPlayers.max = 40 * servers;
    }

    async launch() {
        if (config.get("autoUpdate.enabled"))
            await this.autoUpdater.autoUpdate();

        const database = new Database({
            host: config.get("database.host"),
            database: config.get("database.database"),
            username: config.get("database.username"),
            password: config.get("database.password"),
        });

        this.database = await database.connect();

        this.logHandler = new LogHandler(this);

        this.requestingPlayers = new LRU({
            updateAgeOnGet: true,
        });
        this.cachedPlayers = new LRU({
            updateAgeOnGet: true,
        });
        this.naughtyPlayers = new LRU({
            updateAgeOnGet: true,
        });
        this.punishedPlayers = new LRU({
            updateAgeOnGet: true,
        });

        this.setCacheMaxSize(config.get("servers").length);

        await CreateAccount();

        const error = await Login();
        if (error) logger.error("PlayFab", error);

        this.client.once("ready", async () => {
            const webhooks = await this.client.guilds
                .get(config.get("discord.guildId"))
                .getWebhooks();

            for (let i = 0; i < config.get("servers").length; i++) {
                const server = config.get("servers")[i];

                for (const channel in server.rcon.logChannels) {
                    const channelID = server.rcon.logChannels[channel];
                    if (!channelID.length) continue;

                    const fetchedChannel = this.client.guilds

                        .get(config.get("discord.guildId"))
                        .channels.filter((channel) => channel.type === 0)
                        .find(
                            (channel) => channel.id === channelID
                        ) as Eris.GuildTextableChannel;
                    if (!fetchedChannel) {
                        logger.warn(
                            "Bot",
                            `${
                                channel[0].toUpperCase() + channel.substr(1)
                            } log channel doesn't exist`
                        );

                        continue;
                    }

                    const webhook = webhooks.find(
                        (webhook) =>
                            webhook.channel_id === channelID &&
                            webhook.user.id === this.client.user.id
                    );

                    if (webhook && webhook.token) {
                        logger.info(
                            "Bot",
                            `${
                                channel[0].toUpperCase() + channel.substr(1)
                            } log channel found (Channel: ${
                                fetchedChannel.name
                            }, ID: ${fetchedChannel.id})`
                        );

                        this.servers
                            .get(server.name)
                            .rcon.webhooks.set(
                                channel as
                                    | "chat"
                                    | "punishments"
                                    | "activity"
                                    | "wanted"
                                    | "permanent"
                                    | "automod"
                                    | "killstreak"
                                    | "adminCalls",
                                {
                                    id: webhook.id,
                                    token: webhook.token,
                                }
                            );

                        continue;
                    } else {
                        logger.debug(
                            "Bot",
                            `${
                                channel[0].toUpperCase() + channel.substr(1)
                            } log channel webhook not found (Channel: ${
                                fetchedChannel.name
                            }, ID: ${fetchedChannel.id})`
                        );

                        const newWebhook = await fetchedChannel.createWebhook(
                            {
                                name: `${
                                    channel[0].toUpperCase() + channel.substr(1)
                                } logger`,
                                avatar: this.client.user.avatarURL,
                            },
                            "Automatic webhook creation"
                        );

                        if (newWebhook?.id) {
                            logger.info(
                                "Bot",
                                `${
                                    channel[0].toUpperCase() + channel.substr(1)
                                } log channel webhook was created (Channel: ${
                                    fetchedChannel.name
                                }, ID: ${fetchedChannel.id})`
                            );

                            this.servers
                                .get(server.name)
                                .rcon.webhooks.set(
                                    channel as
                                        | "chat"
                                        | "punishments"
                                        | "activity"
                                        | "wanted"
                                        | "permanent"
                                        | "automod"
                                        | "killstreak"
                                        | "adminCalls",
                                    {
                                        id: newWebhook.id,
                                        token: newWebhook.token,
                                    }
                                );
                        } else {
                            logger.error(
                                "Bot",
                                `${
                                    channel[0].toUpperCase() + channel.substr(1)
                                } log channel webhook creation failed, check error:\n${webhook}`
                            );
                        }
                    }
                }
            }
        });

        await this.client.connect();

        for (let i = 0; i < config.get("servers").length; i++) {
            const server = config.get("servers")[i];

            this.servers.set(server.name, {
                rcon: new Rcon(this, {
                    ...server.rcon,
                    name: server.name,
                }),
                name: server.name,
            });
        }

        logger.info(
            "Bot",
            `Loaded ${pluralize("server", config.get("servers").length, true)}`
        );

        this.antiSlur = new AntiSlur(this);

        this.slashCreator = new SlashCreator({
            applicationID: config.get("bot.id"),
            publicKey: config.get("bot.publicKey"),
            token: this.token,
        })
            .withServer(
                new GatewayServer((handler) =>
                    this.client.on("rawWS", (event) => {
                        // @ts-ignore
                        if (event.t === "INTERACTION_CREATE") handler(event.d);
                    })
                )
            )
            .on("synced", () => {
                logger.info(
                    "Bot",
                    "Synchronized all slash commands with Discord"
                );
            })
            .on("commandError", (command, err, ctx) => {
                logger.error(
                    "Bot",
                    `Error occurred while running command (Command: ${
                        command.commandName
                    }, Error: ${err.message || err})`
                );
            })
            .on("debug", (message) => logger.debug("Bot", message));

        this.loadDiscordCommands();

        this.loadRCONCommands();

        for (const [name, server] of this.servers) {
            server.rcon.initialize();
        }

        logger.info("Bot", "Client initialized - running client.");
    }

    private loadDiscordCommands() {
        const walker = walk(path.join(__dirname, "../commands/discord"));

        walker.on("files", (root, files, next) => {
            const module = path.basename(root);

            logger.info(
                "Bot",
                `Found ${files.length} discord commands in module ${module}`
            );

            let loadedCommands = 0;

            files.forEach((fileStats) => {
                try {
                    const props = require(`${res(root)}/${fileStats.name}`);
                    if (props) {
                        const Command = props.default;
                        this.slashCreator.registerCommand(
                            new Command(
                                this.slashCreator,
                                this,
                                fileStats.name.slice(0, -3).toLowerCase()
                            )
                        );

                        loadedCommands++;
                    }
                } catch (err) {
                    logger.error(
                        "Bot",
                        `Error occurred while loading discord command (${
                            err.message || err
                        })`
                    );
                }
            });

            logger.info(
                "Bot",
                `Loaded ${loadedCommands} discord commands from module ${module}`
            );

            next();
        });

        walker.on("end", () => {
            this.slashCreator.syncCommands({
                deleteCommands: true,
                syncPermissions: true,
                syncGuilds: true,
                // skipGuildErrors: true,
            });
        });
    }

    private loadRCONCommands() {
        const walker = walk(path.join(__dirname, "../commands/rcon"));

        walker.on("files", (root, files, next) => {
            const module = path.basename(root);

            logger.info(
                "Bot",
                `Found ${files.length} RCON commands in module ${module}`
            );

            let loadedCommands = 0;

            files.forEach((fileStats) => {
                try {
                    const props = require(`${res(root)}/${fileStats.name}`);
                    if (props) {
                        const Command = props.default;
                        const command: BaseRCONCommand = new Command(this);

                        this.RCONCommands.push(command);

                        loadedCommands++;
                    }
                } catch (err) {
                    logger.error(
                        "Bot",
                        `Error occurred while loading RCON command (${
                            err.message || err
                        })`
                    );
                }
            });

            logger.info(
                "Bot",
                `Loaded ${loadedCommands} RCON commands from module ${module}`
            );

            next();
        });
    }
}
