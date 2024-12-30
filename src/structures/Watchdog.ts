import flatMap from 'array.prototype.flatmap';
import BigNumber from 'bignumber.js';
import { addMinutes, formatDistanceToNow } from 'date-fns';
import Eris, { Client, Constants, Embed, TextChannel } from 'eris';
import LRU from 'lru-cache';
import fetch from 'node-fetch';
import path, { resolve as res } from 'path';
import pluralize from 'pluralize';
import { GatewayServer, SlashCreator } from 'slash-create';
import { walk } from 'walk';

import LogHandler from '../handlers/logHandler';
import { mentionRole, sendWebhookMessage } from '../services/Discord';
import { CreateAccount, getServerInfo, Login } from '../services/PlayFab';
import config, { Role } from '../structures/Config';
import logger from '../utils/logger';
import MordhauAPI from '../utils/MordhauAPI';
import parseOut from '../utils/parseOut';
import { outputPlayerIDs } from '../utils/PlayerID';
import AntiSlur from './AutoMod';
import AutoUpdater from './AutoUpdater';
import BaseEvent from './BaseEvent';
import BaseRCONCommand from './BaseRCONCommands';
import Database from './Database';
import DiscordEmbed from './DiscordEmbed';
import Rcon from './Rcon';
import Whitelist from './Whitelist';

interface Iids {
    playFabID: string;
    entityID: string;
    steamID: string;
}

export default class Watchdog {
    public client: Client;
    private token: string;
    public startTime: number = Date.now();
    public autoUpdater: AutoUpdater;
    public RCONCommands: BaseRCONCommand[] = [];
    public events: BaseEvent[] = [];
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
    public whitelist: Whitelist;

    // public requestingPlayers: LRU<
    //     string,
    //     {
    //         server: string;
    //         ids: Iids;
    //         id: string;
    //         name: string;
    //     }
    // >;

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
    private statusMessageErrorCount: number = 0;

    async setStatusesChannelPermissions() {
        const servers = config
            .get("servers")
            .filter(
                (s) => s.rcon.status.channel && s.rcon.status.channel.length
            );
        const permissions =
            Constants.Permissions.sendMessages |
            Constants.Permissions.readMessageHistory |
            Constants.Permissions.viewChannel |
            Constants.Permissions.manageMessages;

        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            const statusChannelID = server.rcon.status.channel;

            try {
                const channel = this.client.getChannel(
                    statusChannelID
                ) as TextChannel;

                // channel.permissionOverwrites
                //     .get(this.client.user.id)
                //     .has("viewChannel") &&
                //     channel.permissionOverwrites
                //         .get(this.client.user.id)
                //         .has("readMessages") &&
                //     channel.permissionOverwrites
                //         .get(this.client.user.id)
                //         .has("readMessageHistory") &&
                //     channel.permissionOverwrites
                //         .get(this.client.user.id)
                //         .has("sendMessages") &&
                //     channel.permissionOverwrites
                //         .get(this.client.user.id)
                //         .has("manageMessages");

                if (
                    (BigInt(
                        channel.permissionOverwrites.get(this.client.user.id)
                            ?.allow || false
                    ) &
                        permissions) ===
                    permissions
                )
                    continue;

                await channel.editPermission(
                    this.client.user.id,
                    permissions,
                    0,
                    "member",
                    "Display servers embed"
                );

                logger.info(
                    "Server Status",
                    `Set status channel permissions for ${server.name}`
                );
            } catch (error) {
                logger.error(
                    "Server Status",
                    `Setting status channel permissions failed for ${server.name
                    } (Error: ${error.message || error})`
                );
            }
        }
    }

    async refreshStatuses() {
        const channelIDs = [
            ...new Set(
                config
                    .get("servers")
                    .filter(
                        (s) =>
                            s.rcon.status.channel &&
                            s.rcon.status.channel.length
                    )
                    .map((s) => s.rcon.status.channel)
            ),
        ];
        for (let i = 0; i < channelIDs.length; i++) {
            const channelID = channelIDs[i];
            const messageIDs = (await this.client.getMessages(channelID))
                ?.filter((m) => m.author.id === this.client.user.id)
                .map((m) => m.id);

            await this.client.deleteMessages(channelID, messageIDs);
        }

        for (const [serverName, server] of this.servers) {
            const configServer = config
                .get("servers")
                .find((s) => s.name === server.name);
            const channelID = configServer.rcon.status.channel;
            if (!channelID) {
                return logger.debug(
                    "Server Status",
                    `Skipping ${server.name} status message`
                );
            }

            logger.debug(
                "Server Status",
                `Refreshing ${server.name} status message`
            );

            await this.sendOrUpdateStatus(server, true);
        }
    }

    async sendOrUpdateStatus(
        server: { name: string; rcon: Rcon },
        sendMessage: boolean = false
    ) {
        try {
            const configServer = config
                .get("servers")
                .find((s) => s.name === server.name) || {
                rcon: {
                    status: {
                        updateInterval: 5,
                        channel: "",
                        showPlayerList: false,
                        hideIPPort: false,
                        fallbackValues: {
                            serverName: "",
                            serverPort: 0,
                            maxPlayerCount: 0,
                            passwordProtected: false,
                        },
                    },
                },
            };
            const channelID = configServer.rcon.status.channel;
            if (!channelID) {
                return logger.debug(
                    "Server Status",
                    `Skipping ${server.name} status message`
                );
            }

            logger.debug(
                "Server Status",
                `Updating ${server.name
                } status message (Next update: ${formatDistanceToNow(
                    addMinutes(
                        new Date(),
                        configServer.rcon.status.updateInterval
                    ),
                    { addSuffix: true }
                )})`
            );

            const { online, hostname, currentMap, gamemode, name } =
                await server.rcon.getServerInfo();
            const players = await server.rcon.getIngamePlayers();
            // const players = await Promise.all(
            //     (
            //         await server.rcon.getIngamePlayers()
            //     ).map(
            //         async (p) =>
            //             this.cachedPlayers.get(p.id) ||
            //             (await LookupPlayer(p.id))
            //     )
            // );
            const serverInfo = await getServerInfo({
                name,
                host: server.rcon.options.host,
                port: configServer.rcon.status.fallbackValues.serverPort,
            });
            if (serverInfo) {
                server.rcon.serverName = serverInfo.Tags.ServerName;
                server.rcon.maxPlayerCount = parseInt(
                    serverInfo.Tags.MaxPlayers
                );
            }
            const adress = serverInfo
                ? `${server.rcon.options.host}:${serverInfo.ServerPort}`
                : configServer.rcon.status.fallbackValues.serverPort
                    ? `${server.rcon.options.host}:${configServer.rcon.status.fallbackValues.serverPort}`
                    : "Unknown";
            const maxPlayerCount = Number(configServer.rcon.status.fallbackValues
                .maxPlayerCount
                ? configServer.rcon.status.fallbackValues.maxPlayerCount
                : server.rcon.maxPlayerCount);
            const currentPlayerCount = players.length;
            const longestIDLength = Math.max(
                ...players.map((p) => p.id.length)
            );
            const playerList = online
                ? players
                    .map((p) => {
                        const player = this.cachedPlayers.get(p.id) || {
                            name: p.name,
                            id: p.id,
                        };

                        return `${p.id.padEnd(longestIDLength + 1, " ")}- ${player.name
                            }`;
                    })
                    .join("\n") || "No players online"
                : "Server offline";
            const passwordProtected = serverInfo
                ? serverInfo.Tags.IsPasswordProtected === "true"
                : configServer.rcon.status.fallbackValues.passwordProtected;

            async function generateStatusMessage(baseEmbed?: Embed) {
                const embed = new DiscordEmbed();
                const date = new Date();
                let country: string | boolean;

                if (server.rcon.country && server.rcon.hostname === hostname) {
                    country = server.rcon.country;
                    // baseEmbed?.fields
                    //     ?.find((f) => f.name === "Location")
                    //     ?.value?.split(" ")[1] || false;
                } else {
                    server.rcon.hostname = hostname;

                    const res = await fetch(
                        `https://ipinfo.io/${server.rcon.options.host}/country`
                    );

                    if (res.status === 200) {
                        country = (await res.text()).trim();
                        server.rcon.country = country as string;
                    } else country = false;
                }
                embed
                    .setTitle(
                        `${passwordProtected ? ":lock: " : ""}\`${serverInfo
                            ? serverInfo.Tags.ServerName
                            : configServer.rcon.status.fallbackValues
                                .serverName ||
                            name ||
                            baseEmbed?.title ||
                            "Unknown"
                        }\``
                    )
                    .setColor(
                        online
                            ? currentPlayerCount >= maxPlayerCount
                                ? 15158332
                                : currentPlayerCount * 2 >= maxPlayerCount
                                    ? 16426522
                                    : 4437377
                            : 0
                    )
                    .addField(
                        "Status",
                        online
                            ? `:green_circle: **Online**`
                            : `:red_circle: **Offline**`,
                        true
                    );

                let description = "";
                if (!configServer.rcon.status.hideIPPort) {
                    description += `Connect: ${adress === "Unknown"
                        ? "Unknown"
                        : `steam://connect/${adress}`
                        }`;
                    embed.addField("Address:Port", `\`${adress}\``, true);
                }

                description += `\n\nLast Update: <t:${Math.floor(
                    date.getTime() / 1000
                )}:R>\nNext Update: <t:${Math.ceil(
                    addMinutes(
                        date,
                        configServer.rcon.status.updateInterval
                    ).getTime() / 1000
                )}:R>`;

                embed.setDescription(description);

                let attachment: Buffer
                if (`\`\`\`${playerList}\`\`\``.length > 1024) {
                    attachment = Buffer.from(
                        playerList
                    )
                }

                embed
                    .addField(
                        "Location",
                        typeof country === "string"
                            ? `:${country === "Unknown"
                                ? "united_nations"
                                : `flag_${country.toLowerCase()}`
                            }: ${country}`
                            : ":united_nations: Unknown",
                        true
                    )
                    .addField(
                        "Gamemode",
                        !gamemode
                            ? baseEmbed?.fields?.find(
                                (f) => f.name === "Gamemode"
                            ).value || "Unknown"
                            : `${gamemode || "Unknown"}`,
                        true
                    )
                    .addField(
                        "Current Map",
                        !currentMap
                            ? baseEmbed?.fields?.find(
                                (f) => f.name === "Current Map"
                            ).value || "Unknown"
                            : `${currentMap || "Unknown"}`,
                        true
                    )
                    .addField(
                        `Players${configServer.rcon.status.showPlayerList
                            ? ` ${currentPlayerCount}/${maxPlayerCount}`
                            : ""
                        }`,
                        !configServer.rcon.status.showPlayerList
                            ? `${currentPlayerCount}/${maxPlayerCount}`
                            : `\`\`\`${playerList}\`\`\``.length > 1024
                                ? "See attached text file"
                                : `\`\`\`${playerList}\`\`\``,
                        !configServer.rcon.status.showPlayerList ? true : false
                    )
                    .setFooter(`Mordhau RCON`)

                return { embed, attachment };
            }

            if (sendMessage) {
                const { embed, attachment } = await generateStatusMessage();

                const m = await this.client.createMessage(channelID, {
                    embed: embed.getEmbed(),
                },
                    (attachment && {
                        file: attachment,
                        name: "Output.txt"
                    })
                );

                server.rcon.statusMessageID = m.id;
            } else {
                try {
                    const message = await this.client.getMessage(
                        channelID,
                        server.rcon.statusMessageID
                    );
                    const messageEmbed = message.embeds[0];
                    const baseEmbed = new DiscordEmbed()
                        .setTitle(messageEmbed.title)
                        .setDescription(messageEmbed.description);

                    for (let i = 0; i < messageEmbed.fields.length; i++) {
                        const field = messageEmbed.fields[i];
                        baseEmbed.addField(
                            field.name,
                            field.value,
                            field.inline
                        );
                    }
                    const { embed, attachment } = await generateStatusMessage(messageEmbed);

                    // Force new message, cant upload for edit message
                    if (attachment) {
                        await this.refreshStatuses();
                    } else {
                        await this.client.editMessage(
                            channelID,
                            server.rcon.statusMessageID,
                            {
                                embed: embed.getEmbed(),
                            }
                        );
                    }
                } catch (error) {
                    this.statusMessageErrorCount++;

                    logger.error(
                        "Server Status",
                        `Error occurred while updating ${server.name
                        } status (Error: ${error.message || error
                        }, Message error count: ${this.statusMessageErrorCount
                        })`
                    );

                    if (this.statusMessageErrorCount >= 5) {
                        logger.info(
                            "Server Status",
                            "Message error count limit reached, refreshing embed statuses"
                        );

                        this.statusMessageErrorCount = 0;

                        await this.setStatusesChannelPermissions();

                        await this.refreshStatuses();
                    }
                }
            }
        } catch (error) {
            logger.error(
                "Server Status",
                `Error occurred while updating ${server.name} status (Error: ${error.message || error
                }, Message error count: ${this.statusMessageErrorCount})`
            );
        }
    }

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
        getAdmins: async () => {
            const results: {
                server: string;
                admins: string[];
            }[] = [];

            for (const [serverName, server] of this.servers) {
                if (!server.rcon.connected || !server.rcon.authenticated)
                    continue;

                const admins = await server.rcon.getAdmins();

                results.push({
                    server: serverName,
                    admins,
                });
            }

            return [...new Set(flatMap(results, (result) => result.admins))];
        },
        getMutedPlayer: async (id: string) => {
            const results: {
                server: string;
                data: { id: string; duration: BigNumber };
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
                data: { id: string; duration: BigNumber };
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
                if (!server.rcon.options.killstreaks.enabled) continue;

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
                    !server.rcon.options.killstreaks.enabled ||
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
            duration?: BigNumber,
            reason?: string,
            punishmentServer?: string
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
                                : `Not ${!server.rcon.connected
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
                    if (bannedPlayer.duration.isEqualTo(0)) {
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
                    `ban ${player.id} ${duration || 0} ${reason || "None given"
                    }`
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

                server.rcon.say(
                    `${player.name} has been globally banned by an admin.`
                );

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
                    punishmentServer || "Global",
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
            duration?: BigNumber,
            punishmentServer?: string
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
                                : `Not ${!server.rcon.connected
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
                    if (mutedPlayer.duration.isEqualTo(0)) {
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
                    `mute ${player.id} ${duration.toNumber() || 0}`
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

                server.rcon.say(
                    `${player.name} has been globally muted by an admin.`
                );

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
                    punishmentServer || "Global",
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
            },
            punishmentServer?: string
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
                                : `Not ${!server.rcon.connected
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

                server.rcon.say(
                    `${player.name} has been globally unbanned by an admin.`
                );

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
                    punishmentServer || "Global",
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
            },
            punishmentServer?: string
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
                                : `Not ${!server.rcon.connected
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

                server.rcon.say(
                    `${player.name} has been globally unmuted by an admin.`
                );

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
                    punishmentServer || "Global",
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
            const webhookURLs = [];

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
                                : `Not ${!server.rcon.connected
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

                if (
                    server.rcon.webhooks.get("activity") &&
                    !webhookURLs.includes(server.rcon.webhooks.get("activity"))
                ) {
                    webhookURLs.push(server.rcon.webhooks.get("activity"));
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            for (let i = 0; i < webhookURLs.length; i++) {
                sendWebhookMessage(
                    webhookURLs[i],
                    `${flatMap(
                        (config.get("discord.roles") as Role[]).filter(
                            (role) => role.receiveMentions
                        ),
                        (role) => role.Ids.map((id) => mentionRole(id))
                    )} ${parseOut(player.name)} (${outputPlayerIDs(
                        player.ids,
                        true
                    )})) was given admin privileges (Reason: Global Add Admin)`,
                    {
                        roles: flatMap(
                            (config.get("discord.roles") as Role[]).filter(
                                (role) => role.receiveMentions
                            ),
                            (role) => role.Ids
                        ),
                    }
                );
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
            const webhookURLs = [];

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
                                : `Not ${!server.rcon.connected
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

                if (
                    server.rcon.webhooks.get("activity") &&
                    !webhookURLs.includes(server.rcon.webhooks.get("activity"))
                ) {
                    webhookURLs.push(server.rcon.webhooks.get("activity"));
                }

                servers.push({
                    name: serverName,
                    data: {
                        result,
                        failed: false,
                    },
                });
            }

            for (let i = 0; i < webhookURLs.length; i++) {
                sendWebhookMessage(
                    webhookURLs[i],
                    `${flatMap(
                        (config.get("discord.roles") as Role[]).filter(
                            (role) => role.receiveMentions
                        ),
                        (role) => role.Ids.map((id) => mentionRole(id))
                    )} ${parseOut(player.name)} (${outputPlayerIDs(
                        player.ids,
                        true
                    )})) had their admin privileges removed (Reason: Global Remove Admin)`,
                    {
                        roles: flatMap(
                            (config.get("discord.roles") as Role[]).filter(
                                (role) => role.receiveMentions
                            ),
                            (role) => role.Ids
                        ),
                    }
                );
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
            ignoredFiles: ["bannedWords.json"],
            downloadSubdirectory: "repo",
            backupSubdirectory: "backup",
            autoUpdateInterval: config.get("autoUpdate.checkInterval"),
        });

        this.launch();
    }

    public setCacheMaxSize(servers: number) {
        // this.requestingPlayers.max = 70 * servers;
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

        // this.requestingPlayers = new LRU({
        //     updateAgeOnGet: true,
        // });
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

        await CreateAccount(config.get("mordhau.accountId"));

        const error = await Login(config.get("mordhau.accountId"));
        if (error) logger.error("PlayFab", error);

        this.slashCreator = new SlashCreator({
            applicationID: config.get("bot.id"),
            publicKey: config.get("bot.publicKey"),
            token: this.token,
            allowedMentions: { everyone: false, users: false },
            client: this.client
        })
            .withServer(
                new GatewayServer((handler) =>
                    this.client.on("rawWS", (event) => {
                        try {
                            if (event.t === "INTERACTION_CREATE")
                                // @ts-ignore
                                handler(event.d);
                        } catch (err) {
                            logger.error(
                                "Discord",
                                `Error occurred while handling interaction (${error})`
                            );
                        }
                    })
                )
            )
            .on("synced", () => {
                logger.info(
                    "Bot",
                    "Synchronized all slash commands with Discord"
                );
            })
            .on("commandError", (command, error, ctx) => {
                logger.error(
                    "Bot",
                    `Error occurred while running command (Command: ${command.commandName
                    }, Error: ${error.message || error})`
                );
            })
            .on("error", (error) =>
                logger.error(
                    "Bot",
                    `Error occurred (Error: ${error.message || error})`
                )
            )
            .on("debug", (message) => logger.debug("Bot", message));

        this.client.once("ready", () => this.onInstanceUpdate());
        this.client.on("guildCreate", () => this.onInstanceUpdate());
        this.client.on("guildDelete", () => this.onInstanceUpdate());

        await this.loadEvents();

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

        this.whitelist = new Whitelist(this);

        await this.loadRCONCommands();

        for (const [name, server] of this.servers) {
            const s = config.get("servers").find((s) => s.name === name) || {
                rcon: {
                    status: {
                        updateInterval: 5,
                        channel: "",
                        showPlayerList: false,
                        hideIPPort: false,
                        fallbackValues: {
                            serverName: "",
                            serverPort: 0,
                            maxPlayerCount: 0,
                            passwordProtected: false,
                        },
                    },
                },
            };

            server.rcon.initialize();

            if (!s.rcon.status.channel) continue;

            setInterval(
                () => this.sendOrUpdateStatus(server),
                s.rcon.status.updateInterval * 60 * 1000
            );
        }

        logger.info("Bot", "Client initialized - running client.");
    }

    private async onInstanceUpdate() {
        await this.loadDiscordCommands();

        for (let i = 0; i < config.get("servers").length; i++) {
            const webhooks = flatMap(
                await Promise.all(
                    this.client.guilds.map((guild) => guild.getWebhooks())
                ),
                (webhooks) => webhooks
            );
            const server = config.get("servers")[i];

            for (const channel in server.rcon.logChannels) {
                const channelID = server.rcon.logChannels[channel];
                if (!channelID.length) continue;

                const fetchedChannel = (
                    flatMap(
                        this.client.guilds.map((guild) => guild.channels),
                        (channels) => channels.map((channel) => channel)
                    ) as Eris.GuildTextableChannel[]
                )
                    .filter((channel) => channel.type === 0)
                    .find((channel) => channel.id === channelID);
                if (!fetchedChannel) {
                    logger.warn(
                        "Bot",
                        `${channel[0].toUpperCase() + channel.substr(1)
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
                        `${channel[0].toUpperCase() + channel.substr(1)
                        } log channel found (Channel: ${fetchedChannel.name
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
                            | "adminCalls"
                            | "warns",
                            {
                                id: webhook.id,
                                token: webhook.token,
                            }
                        );

                    continue;
                } else {
                    logger.debug(
                        "Bot",
                        `${channel[0].toUpperCase() + channel.substr(1)
                        } log channel webhook not found (Channel: ${fetchedChannel.name
                        }, ID: ${fetchedChannel.id})`
                    );

                    const newWebhook = await fetchedChannel.createWebhook(
                        {
                            name: `${channel[0].toUpperCase() + channel.substr(1)
                                } logger`,
                            avatar: this.client.user.avatarURL,
                        },
                        "Automatic webhook creation"
                    );

                    if (newWebhook?.id) {
                        logger.info(
                            "Bot",
                            `${channel[0].toUpperCase() + channel.substr(1)
                            } log channel webhook was created (Channel: ${fetchedChannel.name
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
                                | "adminCalls"
                                | "warns",
                                {
                                    id: newWebhook.id,
                                    token: newWebhook.token,
                                }
                            );
                    } else {
                        logger.error(
                            "Bot",
                            `${channel[0].toUpperCase() + channel.substr(1)
                            } log channel webhook creation failed, check error:\n${webhook}`
                        );
                    }
                }
            }
        }

        await this.setStatusesChannelPermissions();

        await this.refreshStatuses();
    }

    private loadDiscordCommands() {
        const walker = walk(path.join(__dirname, "../commands/discord"));

        return new Promise<void>((resolve, reject) => {
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
                            `Error occurred while loading discord command (${err.message || err
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
                    // deleteCommands: true,
                    // syncPermissions: true,
                    syncGuilds: true,
                    // skipGuildErrors: true,
                });

                resolve();
            });
        });
    }

    private loadRCONCommands() {
        const walker = walk(path.join(__dirname, "../commands/rcon"));

        return new Promise<void>((resolve, reject) => {
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
                            const command: BaseRCONCommand = new Command(
                                this,
                                fileStats.name.slice(0, -3).toLowerCase()
                            );

                            this.RCONCommands.push(command);

                            loadedCommands++;
                        }
                    } catch (err) {
                        logger.error(
                            "Bot",
                            `Error occurred while loading RCON command (Error: ${err.message || err
                            }, Command: ${fileStats.name})`
                        );
                    }
                });

                logger.info(
                    "Bot",
                    `Loaded ${loadedCommands} RCON commands from module ${module}`
                );

                next();
            });

            walker.on("end", () => {
                resolve();
            });
        });
    }

    private async loadEvents() {
        const walker = walk(path.join(__dirname, "../events"));

        return new Promise<void>((resolve, reject) => {
            walker.on("files", (root, files, next) => {
                const module = path.basename(root);

                logger.info("Bot", `Found ${files.length} events`);

                let loadedEvents = 0;

                files.forEach((fileStats) => {
                    try {
                        const props = require(`${res(root)}/${fileStats.name}`);
                        if (props) {
                            const Event: BaseEvent = new props.default();
                            const EventData = Event.meta;

                            this.events.push(Event);
                            this.client[EventData?.runOnce ? "once" : "on"](
                                fileStats.name.slice(0, -3),
                                Event.execute.bind(this, this)
                            );

                            loadedEvents++;
                        }
                    } catch (err) {
                        logger.error(
                            "Bot",
                            `Error occurred while loading discord command (${err.message || err
                            })`
                        );
                    }
                });

                logger.info("Bot", `Loaded ${loadedEvents} events`);

                next();
            });

            walker.on("end", () => {
                resolve();
            });
        });
    }
}
