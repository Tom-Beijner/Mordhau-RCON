import Eris, { Client } from "eris";
import LRU from "lru-cache";
import path, { resolve as res } from "path";
import pluralize from "pluralize";
import { GatewayServer, SlashCreator } from "slash-create";
import { walk } from "walk";
import config from "../config.json";
import LogHandler from "../handlers/logHandler";
import { CreateAccount, Login } from "../services/PlayFab";
import logger from "../utils/logger";
import MordhauAPI from "../utils/MordhauAPI";
import AntiSlur from "./AntiSlur";
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
    // public rcon: Rcon;
    // private rconOptions: { host: string; port: number; password: string };
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

        // this.rconOptions = rconOptions;

        this.launch();
    }

    public setCacheMaxSize(servers: number) {
        this.requestingPlayers.max = 70 * servers;
        this.cachedPlayers.max = 70 * servers;
        this.naughtyPlayers.max = 40 * servers;
        this.punishedPlayers.max = 40 * servers;
    }

    async launch() {
        const database = new Database({
            host: config.database.host,
            database: config.database.database,
            username: config.database.username,
            password: config.database.password,
        });

        this.database = await database.connect();

        this.logHandler = new LogHandler(this);

        // const servers = await this.database.Servers.find().lean();

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

        this.setCacheMaxSize(config.servers.length);

        await CreateAccount();

        const error = await Login();
        if (error) logger.error("PlayFab", error);

        for (let i = 0; i < config.servers.length; i++) {
            const server = config.servers[i];

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
            `Loaded ${pluralize("server", config.servers.length, true)}`
        );

        // for (const [name, options] of Object.entries(config.servers)) {
        //     const [
        //         protocol,
        //         host,
        //         port,
        //         username,
        //         password,
        //     ] = options.path.split(":");
        //     this.servers.set(name, {
        //         rcon: new Rcon(this, { ...options.rcon, name }),
        //         name,
        //         options: {
        //             protocol: protocol as "local" | "ftp" | "sftp",
        //             path: "/Mordhau/Saved/Logs/Mordhau.log",
        //             host,
        //             port: parseInt(port),
        //             username,
        //             password,
        //         },
        //     });
        // }

        // this.rcon = new Rcon(this, this.rconOptions);

        this.antiSlur = new AntiSlur(this);

        this.slashCreator = new SlashCreator({
            applicationID: config.bot.id,
            publicKey: config.bot.publicKey,
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

        // await this.rcon.saveCurrentPlayers();
        // await this.rcon.saveAdmins();

        // this.antiSlur.options.ignoredPlayers = [...this.admins.keys()];

        await this.client.connect();

        logger.info("Bot", "Client initialized - running client.");
    }

    private loadDiscordCommands() {
        // const bar = singleBar("Commands");
        const walker = walk(path.join(__dirname, "../commands/discord"));

        walker.on("files", (root, files, next) => {
            // bar.start(files.length, 0, { name: "" });

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

                        // bar.increment(1, {
                        //     name: props.default.name,
                        // });

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
        // const bar = singleBar("Commands");
        const walker = walk(path.join(__dirname, "../commands/rcon"));

        walker.on("files", (root, files, next) => {
            // bar.start(files.length, 0, { name: "" });

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

                        // bar.increment(1, {
                        //     name: props.default.name,
                        // });

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
