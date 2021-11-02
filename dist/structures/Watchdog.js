"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const date_fns_1 = require("date-fns");
const eris_1 = __importStar(require("eris"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importStar(require("path"));
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const walk_1 = require("walk");
const logHandler_1 = __importDefault(require("../handlers/logHandler"));
const Discord_1 = require("../services/Discord");
const PlayFab_1 = require("../services/PlayFab");
const Config_1 = __importDefault(require("../structures/Config"));
const Hastebin_1 = require("../utils/Hastebin");
const logger_1 = __importDefault(require("../utils/logger"));
const MordhauAPI_1 = __importDefault(require("../utils/MordhauAPI"));
const PlayerID_1 = require("../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../utils/RemoveMentions"));
const AutoMod_1 = __importDefault(require("./AutoMod"));
const AutoUpdater_1 = __importDefault(require("./AutoUpdater"));
const Database_1 = __importDefault(require("./Database"));
const DiscordEmbed_1 = __importDefault(require("./DiscordEmbed"));
const Rcon_1 = __importDefault(require("./Rcon"));
class Watchdog {
    constructor(token) {
        this.startTime = Date.now();
        this.RCONCommands = [];
        this.events = [];
        this.servers = new Map();
        this.mordhau = MordhauAPI_1.default;
        this.statusMessageErrorCount = 0;
        this.rcon = {
            getServersInfo: async () => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    const { name, version, gamemode, currentMap } = await server.rcon.getServerInfo();
                    const leftMatchDuration = await server.rcon.getLeftMatchDuration();
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
                const results = [];
                for (const [serverName, server] of this.servers) {
                    const [minTickRate, maxTickRate, avgTickRate] = (await server.rcon.send("stats"))
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
                const results = [];
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
            getIngamePlayer: async (id) => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    const player = await server.rcon.getIngamePlayer(id);
                    if (!player)
                        continue;
                    results.push({
                        server: serverName,
                        id: player.id,
                        name: player.name,
                    });
                }
                return results[0];
            },
            getAdmins: async () => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    if (!server.rcon.connected || !server.rcon.authenticated)
                        continue;
                    const admins = await server.rcon.getAdmins();
                    results.push({
                        server: serverName,
                        admins,
                    });
                }
                return [...new Set(array_prototype_flatmap_1.default(results, (result) => result.admins))];
            },
            getMutedPlayer: async (id) => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    const player = await server.rcon.getMutedPlayer(id);
                    if (!player)
                        continue;
                    results.push({
                        server: serverName,
                        data: player,
                    });
                }
                return results;
            },
            getBannedPlayer: async (id) => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    const player = await server.rcon.getBannedPlayer(id);
                    if (!player)
                        continue;
                    results.push({
                        server: serverName,
                        data: player,
                    });
                }
                return results;
            },
            getKillstreaks: () => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    if (!server.rcon.options.killstreaks.enabled)
                        continue;
                    results.push({
                        server: serverName,
                        data: server.rcon.killStreak.cache.players,
                    });
                }
                return results;
            },
            getHighestKillstreaks: () => {
                const results = [];
                for (const [serverName, server] of this.servers) {
                    if (!server.rcon.options.killstreaks.enabled ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated)
                        continue;
                    results.push({
                        server: serverName,
                        data: server.rcon.killStreak.cache.highestKillstreak,
                    });
                }
                return results;
            },
            globalBan: async (admin, player, duration, reason, punishmentServer) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (server.rcon.options.ignoreGlobalPunishments ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: server.rcon.options.ignoreGlobalPunishments
                                    ? "Ignores global punishments"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
                                failed: true,
                            },
                        });
                        continue;
                    }
                    const bannedPlayer = await server.rcon.getBannedPlayer(player.id);
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
                    let result = await server.rcon.send(`ban ${player.id} ${duration || 0} ${reason || "None given"}`);
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
                if (this.servers.size &&
                    this.servers.size !==
                        servers.filter((server) => server.data.failed).length) {
                    await this.logHandler.banHandler.execute(punishmentServer || "Global", new Date(), player, admin, duration, reason, true);
                }
                return servers;
            },
            globalMute: async (admin, player, duration, punishmentServer) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (server.rcon.options.ignoreGlobalPunishments ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: server.rcon.options.ignoreGlobalPunishments
                                    ? "Ignores global punishments"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
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
                    let result = await server.rcon.send(`mute ${player.id} ${duration.toNumber() || 0}`);
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
                if (this.servers.size &&
                    this.servers.size !==
                        servers.filter((server) => server.data.failed).length) {
                    await this.logHandler.muteHandler.execute(punishmentServer || "Global", new Date(), player, admin, duration, null, true);
                }
                return servers;
            },
            globalUnban: async (admin, player, punishmentServer) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (server.rcon.options.ignoreGlobalPunishments ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: server.rcon.options.ignoreGlobalPunishments
                                    ? "Ignores global punishments"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
                                failed: true,
                            },
                        });
                        continue;
                    }
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
                if (this.servers.size &&
                    this.servers.size !==
                        servers.filter((server) => server.data.failed).length) {
                    await this.logHandler.unbanHandler.execute(punishmentServer || "Global", new Date(), player, admin, null, null, true);
                }
                return servers;
            },
            globalUnmute: async (admin, player, punishmentServer) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (server.rcon.options.ignoreGlobalPunishments ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: server.rcon.options.ignoreGlobalPunishments
                                    ? "Ignores global punishments"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
                                failed: true,
                            },
                        });
                        continue;
                    }
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
                if (this.servers.size &&
                    this.servers.size !==
                        servers.filter((server) => server.data.failed).length) {
                    await this.logHandler.unmuteHandler.execute(punishmentServer || "Global", new Date(), player, admin, null, null, true);
                }
                return servers;
            },
            globalAddAdmin: async (player) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (server.rcon.admins.has(player.id) ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: server.rcon.admins.has(player.id)
                                    ? "Already an admin"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
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
                    Discord_1.sendWebhookMessage(server.rcon.webhooks.get("activity"), `${array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids.map((id) => Discord_1.mentionRole(id)))} ${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)})) was given admin privileges (Reason: Global Add Admin)`);
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
            globalRemoveAdmin: async (player) => {
                const servers = [];
                for (const [serverName, server] of this.servers) {
                    if (!server.rcon.admins.has(player.id) ||
                        !server.rcon.connected ||
                        !server.rcon.authenticated) {
                        servers.push({
                            name: serverName,
                            data: {
                                result: !server.rcon.admins.has(player.id)
                                    ? "Not an admin"
                                    : `Not ${!server.rcon.connected
                                        ? "connected"
                                        : "authenticated"} to server`,
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
                    Discord_1.sendWebhookMessage(server.rcon.webhooks.get("activity"), `${array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids.map((id) => Discord_1.mentionRole(id)))} ${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)})) had their admin privileges removed (Reason: Global Remove Admin)`);
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
        this.client = eris_1.default(token, {
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
        this.autoUpdater = new AutoUpdater_1.default({
            repository: "Tom-Beijner/Mordhau-RCON",
            branch: "master",
            ignoredFiles: ["bannedWords.json"],
            downloadSubdirectory: "repo",
            backupSubdirectory: "backup",
            autoUpdateInterval: Config_1.default.get("autoUpdate.checkInterval"),
        });
        this.launch();
    }
    async setStatusesChannelPermissions() {
        var _a;
        const servers = Config_1.default
            .get("servers")
            .filter((s) => s.rcon.status.channel && s.rcon.status.channel.length);
        const permissions = eris_1.Constants.Permissions.sendMessages |
            eris_1.Constants.Permissions.readMessageHistory |
            eris_1.Constants.Permissions.viewChannel |
            eris_1.Constants.Permissions.manageMessages;
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            const statusChannelID = server.rcon.status.channel;
            try {
                const channel = this.client.getChannel(statusChannelID);
                if ((BigInt(((_a = channel.permissionOverwrites.get(this.client.user.id)) === null || _a === void 0 ? void 0 : _a.allow) || false) &
                    permissions) ===
                    permissions)
                    continue;
                await channel.editPermission(this.client.user.id, permissions, 0, "member", "Display servers embed");
                logger_1.default.info("Server Status", `Set status channel permissions for ${server.name}`);
            }
            catch (error) {
                logger_1.default.error("Server Status", `Setting status channel permissions failed for ${server.name} (Error: ${error.message || error})`);
            }
        }
    }
    async refreshStatuses() {
        var _a;
        const channelIDs = [
            ...new Set(Config_1.default
                .get("servers")
                .filter((s) => s.rcon.status.channel &&
                s.rcon.status.channel.length)
                .map((s) => s.rcon.status.channel)),
        ];
        for (let i = 0; i < channelIDs.length; i++) {
            const channelID = channelIDs[i];
            const messageIDs = (_a = (await this.client.getMessages(channelID))) === null || _a === void 0 ? void 0 : _a.filter((m) => m.author.id === this.client.user.id).map((m) => m.id);
            await this.client.deleteMessages(channelID, messageIDs);
        }
        for (const [serverName, server] of this.servers) {
            const configServer = Config_1.default
                .get("servers")
                .find((s) => s.name === server.name);
            const channelID = configServer.rcon.status.channel;
            if (!channelID) {
                return logger_1.default.debug("Server Status", `Skipping ${server.name} status message`);
            }
            logger_1.default.debug("Server Status", `Refreshing ${server.name} status message`);
            await this.sendOrUpdateStatus(server, true);
        }
    }
    async sendOrUpdateStatus(server, sendMessage = false) {
        try {
            const configServer = Config_1.default
                .get("servers")
                .find((s) => s.name === server.name);
            const channelID = configServer.rcon.status.channel;
            if (!channelID) {
                return logger_1.default.debug("Server Status", `Skipping ${server.name} status message`);
            }
            logger_1.default.debug("Server Status", `Updating ${server.name} status message (Next update: ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(new Date(), configServer.rcon.status.updateInterval), { addSuffix: true })})`);
            const { online, hostname, currentMap, gamemode, name } = await server.rcon.getServerInfo();
            const players = await server.rcon.getIngamePlayers();
            const serverInfo = await PlayFab_1.getServerInfo({
                name,
                host: server.rcon.options.host,
                port: configServer.rcon.status.fallbackValues.serverPort,
            });
            if (serverInfo) {
                server.rcon.maxPlayerCount = parseInt(serverInfo.Tags.MaxPlayers);
            }
            const adress = serverInfo
                ? `${server.rcon.options.host}:${serverInfo.ServerPort}`
                : configServer.rcon.status.fallbackValues.serverPort
                    ? `${server.rcon.options.host}:${configServer.rcon.status.fallbackValues.serverPort}`
                    : "Unknown";
            const maxPlayerCount = configServer.rcon.status.fallbackValues
                .maxPlayerCount
                ? configServer.rcon.status.fallbackValues.maxPlayerCount
                : server.rcon.maxPlayerCount;
            const currentPlayerCount = players.length;
            const playerList = online
                ? players.map((p) => `${p.id} - ${p.name}`).join("\n") ||
                    "No players online"
                : "Server offline";
            const passwordProtected = serverInfo
                ? serverInfo.Tags.IsPasswordProtected === "true"
                : configServer.rcon.status.fallbackValues.passwordProtected;
            async function generateStatusMessage(baseEmbed) {
                var _a, _b;
                const embed = new DiscordEmbed_1.default();
                const date = new Date();
                let country;
                if (server.rcon.country && server.rcon.hostname === hostname) {
                    country = server.rcon.country;
                }
                else {
                    server.rcon.hostname = hostname;
                    const res = await node_fetch_1.default(`https://ipinfo.io/${server.rcon.options.host}/country`);
                    if (res.status === 200) {
                        country = (await res.text()).trim();
                        server.rcon.country = country;
                    }
                    else
                        country = false;
                }
                embed
                    .setTitle(`${passwordProtected ? ":lock: " : ""}\`${serverInfo
                    ? serverInfo.Tags.ServerName
                    : configServer.rcon.status.fallbackValues
                        .serverName ||
                        name ||
                        (baseEmbed === null || baseEmbed === void 0 ? void 0 : baseEmbed.title) ||
                        "Unknown"}\``)
                    .setColor(online
                    ? currentPlayerCount >= maxPlayerCount
                        ? 15158332
                        : currentPlayerCount * 2 >= maxPlayerCount
                            ? 16426522
                            : 4437377
                    : 0)
                    .addField("Status", online
                    ? `:green_circle: **Online**`
                    : `:red_circle: **Offline**`, true);
                let description = "";
                if (!configServer.rcon.status.hideIPPort) {
                    description += `Connect: ${adress === "Unknown"
                        ? "Unknown"
                        : `steam://connect/${adress}`}`;
                    embed.addField("Address:Port", `\`${adress}\``, true);
                }
                description += `\n\nLast Update: <t:${Math.floor(date.getTime() / 1000)}:R>\nNext Update: <t:${Math.ceil(date_fns_1.addMinutes(date, configServer.rcon.status.updateInterval).getTime() / 1000)}:R>`;
                embed.setDescription(description);
                embed
                    .addField("Location", typeof country === "string"
                    ? `:${country === "Unknown"
                        ? "united_nations"
                        : `flag_${country.toLowerCase()}`}: ${country}`
                    : ":united_nations: Unknown", true)
                    .addField("Gamemode", !gamemode
                    ? ((_a = baseEmbed === null || baseEmbed === void 0 ? void 0 : baseEmbed.fields) === null || _a === void 0 ? void 0 : _a.find((f) => f.name === "Gamemode").value) || "Unknown"
                    : `${gamemode || "Unknown"}`, true)
                    .addField("Current Map", !currentMap
                    ? ((_b = baseEmbed === null || baseEmbed === void 0 ? void 0 : baseEmbed.fields) === null || _b === void 0 ? void 0 : _b.find((f) => f.name === "Current Map").value) || "Unknown"
                    : `${currentMap || "Unknown"}`, true)
                    .addField(`Players${configServer.rcon.status.showPlayerList
                    ? ` ${currentPlayerCount}/${maxPlayerCount}`
                    : ""}`, !configServer.rcon.status.showPlayerList
                    ? `${currentPlayerCount}/${maxPlayerCount}`
                    : `\`\`\`${playerList}\`\`\``.length > 1024
                        ? `[paste.gg](${await Hastebin_1.hastebin(playerList)})`
                        : `\`\`\`${playerList}\`\`\``, !configServer.rcon.status.showPlayerList ? true : false)
                    .setFooter(`Mordhau RCON`);
                return embed;
            }
            if (sendMessage) {
                const embed = await generateStatusMessage();
                const m = await this.client.createMessage(channelID, {
                    embed: embed.getEmbed(),
                });
                server.rcon.statusMessageID = m.id;
            }
            else {
                try {
                    const message = await this.client.getMessage(channelID, server.rcon.statusMessageID);
                    const messageEmbed = message.embeds[0];
                    const baseEmbed = new DiscordEmbed_1.default()
                        .setTitle(messageEmbed.title)
                        .setDescription(messageEmbed.description);
                    for (let i = 0; i < messageEmbed.fields.length; i++) {
                        const field = messageEmbed.fields[i];
                        baseEmbed.addField(field.name, field.value, field.inline);
                    }
                    const embed = await generateStatusMessage(messageEmbed);
                    await this.client.editMessage(channelID, server.rcon.statusMessageID, {
                        embed: embed.getEmbed(),
                    });
                }
                catch (error) {
                    this.statusMessageErrorCount++;
                    logger_1.default.error("Server Status", `Error occurred while updating ${server.name} status (Error: ${error.message || error}, Message error count: ${this.statusMessageErrorCount})`);
                    if (this.statusMessageErrorCount >= 5) {
                        logger_1.default.info("Server Status", "Message error count limit reached, refreshing embed statuses");
                        this.statusMessageErrorCount = 0;
                        await this.setStatusesChannelPermissions();
                        await this.refreshStatuses();
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error("Server Status", `Error occurred while updating ${server.name} status (Error: ${error.message || error}, Message error count: ${this.statusMessageErrorCount})`);
        }
    }
    setCacheMaxSize(servers) {
        this.cachedPlayers.max = 70 * servers;
        this.naughtyPlayers.max = 40 * servers;
        this.punishedPlayers.max = 40 * servers;
    }
    async launch() {
        if (Config_1.default.get("autoUpdate.enabled"))
            await this.autoUpdater.autoUpdate();
        const database = new Database_1.default({
            host: Config_1.default.get("database.host"),
            database: Config_1.default.get("database.database"),
            username: Config_1.default.get("database.username"),
            password: Config_1.default.get("database.password"),
        });
        this.database = await database.connect();
        this.logHandler = new logHandler_1.default(this);
        this.cachedPlayers = new lru_cache_1.default({
            updateAgeOnGet: true,
        });
        this.naughtyPlayers = new lru_cache_1.default({
            updateAgeOnGet: true,
        });
        this.punishedPlayers = new lru_cache_1.default({
            updateAgeOnGet: true,
        });
        this.setCacheMaxSize(Config_1.default.get("servers").length);
        await PlayFab_1.CreateAccount();
        const error = await PlayFab_1.Login();
        if (error)
            logger_1.default.error("PlayFab", error);
        this.slashCreator = new slash_create_1.SlashCreator({
            applicationID: Config_1.default.get("bot.id"),
            publicKey: Config_1.default.get("bot.publicKey"),
            token: this.token,
            allowedMentions: { everyone: false, users: false },
        })
            .withServer(new slash_create_1.GatewayServer((handler) => this.client.on("rawWS", (event) => {
            if (event.t === "INTERACTION_CREATE")
                handler(event.d);
        })))
            .on("synced", () => {
            logger_1.default.info("Bot", "Synchronized all slash commands with Discord");
        })
            .on("commandError", (command, err, ctx) => {
            logger_1.default.error("Bot", `Error occurred while running command (Command: ${command.commandName}, Error: ${err.message || err})`);
        })
            .on("debug", (message) => logger_1.default.debug("Bot", message));
        this.client.once("ready", () => this.onInstanceUpdate());
        this.client.on("guildCreate", () => this.onInstanceUpdate());
        this.client.on("guildDelete", () => this.onInstanceUpdate());
        await this.loadEvents();
        await this.client.connect();
        for (let i = 0; i < Config_1.default.get("servers").length; i++) {
            const server = Config_1.default.get("servers")[i];
            this.servers.set(server.name, {
                rcon: new Rcon_1.default(this, {
                    ...server.rcon,
                    name: server.name,
                }),
                name: server.name,
            });
        }
        logger_1.default.info("Bot", `Loaded ${pluralize_1.default("server", Config_1.default.get("servers").length, true)}`);
        this.antiSlur = new AutoMod_1.default(this);
        await this.loadRCONCommands();
        for (const [name, server] of this.servers) {
            const s = Config_1.default.get("servers").find((s) => s.name === name);
            server.rcon.initialize();
            if (!s.rcon.status.channel)
                continue;
            setInterval(() => this.sendOrUpdateStatus(server), s.rcon.status.updateInterval * 60 * 1000);
        }
        logger_1.default.info("Bot", "Client initialized - running client.");
    }
    async onInstanceUpdate() {
        await this.loadDiscordCommands();
        for (let i = 0; i < Config_1.default.get("servers").length; i++) {
            const webhooks = array_prototype_flatmap_1.default(await Promise.all(this.client.guilds.map((guild) => guild.getWebhooks())), (webhooks) => webhooks);
            const server = Config_1.default.get("servers")[i];
            for (const channel in server.rcon.logChannels) {
                const channelID = server.rcon.logChannels[channel];
                if (!channelID.length)
                    continue;
                const fetchedChannel = array_prototype_flatmap_1.default(this.client.guilds.map((guild) => guild.channels), (channels) => channels.map((channel) => channel))
                    .filter((channel) => channel.type === 0)
                    .find((channel) => channel.id === channelID);
                if (!fetchedChannel) {
                    logger_1.default.warn("Bot", `${channel[0].toUpperCase() + channel.substr(1)} log channel doesn't exist`);
                    continue;
                }
                const webhook = webhooks.find((webhook) => webhook.channel_id === channelID &&
                    webhook.user.id === this.client.user.id);
                if (webhook && webhook.token) {
                    logger_1.default.info("Bot", `${channel[0].toUpperCase() + channel.substr(1)} log channel found (Channel: ${fetchedChannel.name}, ID: ${fetchedChannel.id})`);
                    this.servers
                        .get(server.name)
                        .rcon.webhooks.set(channel, {
                        id: webhook.id,
                        token: webhook.token,
                    });
                    continue;
                }
                else {
                    logger_1.default.debug("Bot", `${channel[0].toUpperCase() + channel.substr(1)} log channel webhook not found (Channel: ${fetchedChannel.name}, ID: ${fetchedChannel.id})`);
                    const newWebhook = await fetchedChannel.createWebhook({
                        name: `${channel[0].toUpperCase() + channel.substr(1)} logger`,
                        avatar: this.client.user.avatarURL,
                    }, "Automatic webhook creation");
                    if (newWebhook === null || newWebhook === void 0 ? void 0 : newWebhook.id) {
                        logger_1.default.info("Bot", `${channel[0].toUpperCase() + channel.substr(1)} log channel webhook was created (Channel: ${fetchedChannel.name}, ID: ${fetchedChannel.id})`);
                        this.servers
                            .get(server.name)
                            .rcon.webhooks.set(channel, {
                            id: newWebhook.id,
                            token: newWebhook.token,
                        });
                    }
                    else {
                        logger_1.default.error("Bot", `${channel[0].toUpperCase() + channel.substr(1)} log channel webhook creation failed, check error:\n${webhook}`);
                    }
                }
            }
        }
        await this.setStatusesChannelPermissions();
        await this.refreshStatuses();
    }
    loadDiscordCommands() {
        const walker = walk_1.walk(path_1.default.join(__dirname, "../commands/discord"));
        return new Promise((resolve, reject) => {
            walker.on("files", (root, files, next) => {
                const module = path_1.default.basename(root);
                logger_1.default.info("Bot", `Found ${files.length} discord commands in module ${module}`);
                let loadedCommands = 0;
                files.forEach((fileStats) => {
                    try {
                        const props = require(`${path_1.resolve(root)}/${fileStats.name}`);
                        if (props) {
                            const Command = props.default;
                            this.slashCreator.registerCommand(new Command(this.slashCreator, this, fileStats.name.slice(0, -3).toLowerCase()));
                            loadedCommands++;
                        }
                    }
                    catch (err) {
                        logger_1.default.error("Bot", `Error occurred while loading discord command (${err.message || err})`);
                    }
                });
                logger_1.default.info("Bot", `Loaded ${loadedCommands} discord commands from module ${module}`);
                next();
            });
            walker.on("end", () => {
                this.slashCreator.syncCommands({
                    syncPermissions: true,
                    syncGuilds: true,
                    skipGuildErrors: true,
                });
                resolve();
            });
        });
    }
    loadRCONCommands() {
        const walker = walk_1.walk(path_1.default.join(__dirname, "../commands/rcon"));
        return new Promise((resolve, reject) => {
            walker.on("files", (root, files, next) => {
                const module = path_1.default.basename(root);
                logger_1.default.info("Bot", `Found ${files.length} RCON commands in module ${module}`);
                let loadedCommands = 0;
                files.forEach((fileStats) => {
                    try {
                        const props = require(`${path_1.resolve(root)}/${fileStats.name}`);
                        if (props) {
                            const Command = props.default;
                            const command = new Command(this, fileStats.name.slice(0, -3).toLowerCase());
                            this.RCONCommands.push(command);
                            loadedCommands++;
                        }
                    }
                    catch (err) {
                        logger_1.default.error("Bot", `Error occurred while loading RCON command (Error: ${err.message || err}, Command: ${fileStats.name})`);
                    }
                });
                logger_1.default.info("Bot", `Loaded ${loadedCommands} RCON commands from module ${module}`);
                next();
            });
            walker.on("end", () => {
                resolve();
            });
        });
    }
    async loadEvents() {
        const walker = walk_1.walk(path_1.default.join(__dirname, "../events"));
        return new Promise((resolve, reject) => {
            walker.on("files", (root, files, next) => {
                const module = path_1.default.basename(root);
                logger_1.default.info("Bot", `Found ${files.length} events`);
                let loadedEvents = 0;
                files.forEach((fileStats) => {
                    try {
                        const props = require(`${path_1.resolve(root)}/${fileStats.name}`);
                        if (props) {
                            const Event = new props.default();
                            const EventData = Event.meta;
                            this.events.push(Event);
                            this.client[(EventData === null || EventData === void 0 ? void 0 : EventData.runOnce) ? "once" : "on"](fileStats.name.slice(0, -3), Event.execute.bind(this, this));
                            loadedEvents++;
                        }
                    }
                    catch (err) {
                        logger_1.default.error("Bot", `Error occurred while loading discord command (${err.message || err})`);
                    }
                });
                logger_1.default.info("Bot", `Loaded ${loadedEvents} events`);
                next();
            });
            walker.on("end", () => {
                resolve();
            });
        });
    }
}
exports.default = Watchdog;
