"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const crud_object_diff_1 = require("crud-object-diff");
const date_fns_1 = require("date-fns");
const deep_cleaner_1 = __importDefault(require("deep-cleaner"));
const easytimer_js_1 = __importDefault(require("easytimer.js"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const pluralize_1 = __importDefault(require("pluralize"));
const rcon_1 = require("../rcon");
const Discord_1 = require("../services/Discord");
const PlayFab_1 = require("../services/PlayFab");
const Config_1 = __importDefault(require("../structures/Config"));
const logger_1 = __importDefault(require("../utils/logger"));
const parseOut_1 = __importDefault(require("../utils/parseOut"));
const PlayerID_1 = require("../utils/PlayerID");
const AdminActivityConfig_1 = __importDefault(require("./AdminActivityConfig"));
const KillStreak_1 = __importDefault(require("./KillStreak"));
const MapVote_1 = __importDefault(require("./MapVote"));
const RCONCommandContext_1 = __importDefault(require("./RCONCommandContext"));
const StatsConfig_1 = __importDefault(require("./StatsConfig"));
class Rcon {
    constructor(bot, options) {
        this.initiate = true;
        this.connected = false;
        this.authenticated = false;
        this.reconnecting = false;
        this.webhooks = new Map();
        this.admins = new Set();
        this.tempCurrentPlayers = [];
        this.maxPlayerCount = "Unknown";
        this.timer = new easytimer_js_1.default({ countdown: true });
        this.currentMatchState = "waiting-to-start";
        this.options = options;
        this.bot = bot;
        if (options.killstreaks.enabled)
            this.killStreak = new KillStreak_1.default(this, options.name);
        this.mapVote = new MapVote_1.default(this);
        this.timer.on("targetAchieved", () => {
            var _a, _b, _c, _d;
            const channelID = (_b = (_a = Config_1.default
                .get("servers")
                .find((s) => s.name === this.options.name).rcon) === null || _a === void 0 ? void 0 : _a.serverDownNotification) === null || _b === void 0 ? void 0 : _b.channel;
            if (!channelID)
                return;
            const channel = this.bot.client.getChannel(channelID);
            if (!channel)
                return;
            this.bot.client.createMessage(channelID, {
                content: `${array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids.map((id) => Discord_1.mentionRole(id)))}`,
                embed: {
                    title: `Server **${this.options.name}** is down.`,
                    description: `The server is down for more than **${pluralize_1.default("minute", (_d = (_c = Config_1.default
                        .get("servers")
                        .find((s) => s.name === this.options.name).rcon) === null || _c === void 0 ? void 0 : _c.serverDownNotification) === null || _d === void 0 ? void 0 : _d.timer, true)}**`,
                    color: 0xff0000,
                },
            });
        });
    }
    async banUser(server, admin, player, duration, reason, shouldSave = true) {
        if (!this.connected || !this.authenticated) {
            return `Not ${!this.connected ? "connected" : "authenticated"} to server`;
        }
        let result = await this.rcon.send(`ban ${player.id} ${duration.toNumber() || 0} ${reason}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }
        this.say(`${player.name} has been banned by an admin.`);
        this.say(`${player.name} has been banned for ${duration && !duration.isEqualTo(0) && !duration.isNaN()
            ? pluralize_1.default("minute", duration.toNumber(), true)
            : "PERMANENTLY"} by ${admin.name} (${admin.id}).\nReason: ${reason || "none given"}`, "adminchat");
        if (!shouldSave)
            return;
        this.bot.logHandler.banHandler.execute(server, new Date(), player, admin, duration, reason);
    }
    async unbanUser(server, admin, player, shouldSave = true) {
        if (!this.connected || !this.authenticated) {
            return `Not ${!this.connected ? "connected" : "authenticated"} to server`;
        }
        let result = await this.rcon.send(`unban ${player.id}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }
        this.say(`${player.name} has been unbanned by an admin.`);
        this.say(`${player.name} has been unbanned by ${admin.name} (${admin.id}).`, "adminchat");
        if (!shouldSave)
            return;
        this.bot.logHandler.unbanHandler.execute(server, new Date(), player, admin);
    }
    async kickUser(server, admin, player, reason, shouldSave = true) {
        if (!this.connected || !this.authenticated) {
            return `Not ${!this.connected ? "connected" : "authenticated"} to server`;
        }
        let result = await this.rcon.send(`kick ${player.id} ${reason}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("succeeded")) {
            return result;
        }
        this.say(`${player.name} has been kicked by ${admin.name} (${admin.id}).\nReason: ${reason || "none give"}`, "adminchat");
        if (!shouldSave)
            return;
        this.bot.logHandler.kickHandler.execute(server, new Date(), player, admin, null, reason);
    }
    async muteUser(server, admin, player, duration, shouldSave = true) {
        if (!this.connected || !this.authenticated) {
            return `Not ${!this.connected ? "connected" : "authenticated"} to server`;
        }
        let result = await this.rcon.send(`mute ${player.id} ${duration.toNumber() || 0}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }
        this.say(`${player.name} has been muted by ${admin.name} (${admin.id}).`, "adminchat");
        if (!shouldSave)
            return;
        this.bot.logHandler.muteHandler.execute(server, new Date(), player, admin, duration);
    }
    async unmuteUser(server, admin, player, shouldSave = true) {
        if (!this.connected || !this.authenticated) {
            return `Not ${!this.connected ? "connected" : "authenticated"} to server`;
        }
        let result = await this.rcon.send(`unmute ${player.id}`);
        result = result.split("\n")[0].trim();
        if (!result.includes("processed successfully")) {
            return result;
        }
        this.say(`${player.name} has been unmuted by an admin.`);
        this.say(`${player.name} has been unmuted by ${admin.name} (${admin.id}).`, "adminchat");
        if (!shouldSave)
            return;
        this.bot.logHandler.unmuteHandler.execute(server, new Date(), player, admin);
    }
    async send(message) {
        return await this.rcon.send(message);
    }
    async say(message, messageType) {
        if (messageType)
            return;
        return await this.rcon.send(`say ${message}`);
    }
    async changeMap(map) {
        return await this.rcon.send(`changelevel ${map}`);
    }
    async getServerInfo() {
        const [hostname, name, version, gamemode, currentMap] = (await this.rcon.send("info"))
            .split("\n")
            .map((stat) => stat.split(": ")[1]);
        this.hostname = hostname;
        this.currentGamemode = gamemode === null || gamemode === void 0 ? void 0 : gamemode.toLowerCase();
        this.currentMap = currentMap === null || currentMap === void 0 ? void 0 : currentMap.toLowerCase();
        return {
            online: typeof hostname !== "undefined",
            hostname,
            name,
            version,
            gamemode,
            currentMap,
        };
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
            .filter((id) => id.length &&
            id !== "Not connected" &&
            id !== "No admins found in admin list");
    }
    async saveAdmins() {
        if (!this.authenticated)
            return;
        const currentAdminList = new Set();
        (await this.getAdmins()).forEach((adminID) => {
            currentAdminList.add(adminID);
        });
        if (this.initiate || !this.options.adminListSaving) {
            this.admins = currentAdminList;
            return;
        }
        const { createdVals: unauthorizedNewAdmins, deletedVals: unauthorizedRemovedAdmins, } = crud_object_diff_1.compareArrayVals([[...this.admins], [...currentAdminList]]);
        if (!unauthorizedNewAdmins && !unauthorizedRemovedAdmins)
            return;
        if (!Config_1.default.get("adminListSaving.rollbackAdmins"))
            this.admins = currentAdminList;
        const affectedPlayers = [];
        const affectedAdmins = [];
        if (unauthorizedNewAdmins === null || unauthorizedNewAdmins === void 0 ? void 0 : unauthorizedNewAdmins.length) {
            for (let i = 0; i < unauthorizedNewAdmins.length; i++) {
                const adminID = unauthorizedNewAdmins[i];
                if (Config_1.default.get("adminListSaving.rollbackAdmins"))
                    await this.removeAdmin(adminID);
                affectedPlayers.push(this.bot.cachedPlayers.get(adminID) ||
                    (await PlayFab_1.LookupPlayer(adminID)));
            }
            let attachment;
            if (affectedPlayers
                .map((player) => `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)})`)
                .join(", ").length > 900) {
                attachment = Buffer.from(affectedPlayers
                    .map((player) => `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)})`)
                    .join(", "));
            }
            logger_1.default.warn("RCON", `Following players: ${affectedPlayers
                .map((player) => `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)})`)
                .join(", ")} was given privileges without permission${Config_1.default.get("adminListSaving.rollbackAdmins")
                ? ", they've been removed"
                : ""} (Server: ${this.options.name})`);
            Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `${array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids.map((id) => Discord_1.mentionRole(id)))} Following players: ${affectedPlayers
                .map((player) => `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`)
                .join(", ").length > 900
                ? "See attached text file"
                : affectedPlayers
                    .map((player) => `${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`)
                    .join(", ")} was given admin privileges on without permission${Config_1.default.get("adminListSaving.rollbackAdmins")
                ? ", they've been removed"
                : ""} (Server: ${this.options.name})`, {
                roles: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids),
            }, [
                { attachment: attachment, name: "Output.txt" }
            ]);
        }
        if (unauthorizedRemovedAdmins === null || unauthorizedRemovedAdmins === void 0 ? void 0 : unauthorizedRemovedAdmins.length) {
            for (let i = 0; i < unauthorizedRemovedAdmins.length; i++) {
                const adminID = unauthorizedRemovedAdmins[i];
                if (Config_1.default.get("adminListSaving.rollbackAdmins"))
                    await this.addAdmin(adminID);
                affectedAdmins.push(this.bot.cachedPlayers.get(adminID) ||
                    (await PlayFab_1.LookupPlayer(adminID)));
            }
            let attachment;
            if (affectedAdmins
                .map((admin) => `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids, true)})`)
                .join(", ").length > 900) {
                attachment = Buffer.from(affectedAdmins
                    .map((admin) => `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)})`)
                    .join(", "));
            }
            logger_1.default.warn("RCON", `Following admins: ${affectedAdmins
                .map((player) => `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)})`)
                .join(", ")} had their privileges removed without permission${Config_1.default.get("adminListSaving.rollbackAdmins")
                ? ", they've been added back"
                : ""} (Server: ${this.options.name})`);
            Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `${array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids.map((id) => Discord_1.mentionRole(id)))} Following admins: ${affectedAdmins
                .map((admin) => `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids, true)})`)
                .join(", ").length > 900
                ? "See attached text file"
                : parseOut_1.default(affectedAdmins
                    .map((admin) => `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids, true)})`)
                    .join(", "))}  had their privileges removed without permission${Config_1.default.get("adminListSaving.rollbackAdmins")
                ? ", they've been added back"
                : ""} (Server: ${this.options.name})`, {
                roles: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.receiveMentions), (role) => role.Ids),
            }, [
                { attachment: attachment, name: "Output.txt" }
            ]);
        }
        logger_1.default.warn("RCON", "Investigate this!");
    }
    async addAdmin(id) {
        let res = await this.rcon.send(`addadmin ${id}`);
        res = res.split("\n")[0].trim();
        return res;
    }
    async removeAdmin(id) {
        let res = await this.rcon.send(`removeadmin ${id}`);
        res = res.split("\n")[0].trim();
        return res;
    }
    async getBannedPlayers() {
        return (await this.rcon.send("banlist"))
            .split("\n")
            .map((ban) => ban.split(", "));
    }
    async getBannedPlayer(id) {
        const bannedPlayer = (await this.getBannedPlayers()).find((ban) => ban[0] === id);
        return bannedPlayer && { id, duration: new bignumber_js_1.default(bannedPlayer[1]) };
    }
    async getMutedPlayers() {
        return (await this.rcon.send("mutelist"))
            .split("\n")
            .map((ban) => ban.split(", "));
    }
    async getMutedPlayer(id) {
        const mutedPlayer = (await this.getMutedPlayers()).find((ban) => ban[0] === id);
        return mutedPlayer && { id, duration: new bignumber_js_1.default(mutedPlayer[1]) };
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
        }
        catch {
            return [];
        }
    }
    async saveIngamePlayers() {
        (await this.getIngamePlayers()).forEach(async (player) => this.getPlayerToCache(player.id));
    }
    async getIngamePlayer(id) {
        var _a;
        return (_a = new fuse_js_1.default(await this.getIngamePlayers(), {
            threshold: 0.2,
            minMatchCharLength: 2,
            keys: [
                {
                    name: "id",
                    weight: 10,
                },
                {
                    name: "name",
                    weight: 1,
                },
            ],
        }).search({ $or: [{ name: id }, { id: `${id}` }] })[0]) === null || _a === void 0 ? void 0 : _a.item;
    }
    async teleportPlayer(id, coords) {
        try {
            await this.rcon.send(`teleportplayer ${id} x=${coords.x},y=${coords.y},z=${coords.z}`);
        }
        catch (error) {
            return error;
        }
    }
    async killPlayer(player) {
        await this.send(`killplayer ${player.id}`);
        await this.say(`${player.name} has been killed with magic`);
    }
    async getPlayerToCache(id) {
        const player = await PlayFab_1.LookupPlayer(id);
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
    onMatchWaitingToStart() {
        this.tempCurrentPlayers = [];
    }
    async onMatchStart() {
        await this.updateCache();
        this.mapVote.onMatchStart();
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
            if (this.options.killstreaks.enabled) {
                this.killStreak.sendMessage(message);
                this.say(message);
            }
            if (this.options.automod)
                this.say(`AutoMod: This server has an AutoMod, usage of profane language will lead to mutes and bans.`);
            if (this.options.killstreaks.enabled)
                this.say(`Killstreak: Killstreaks has been enabled.`);
            const { gamemode } = await this.getServerInfo();
            if (gamemode === "Deathmatch") {
                const leftMatchDuration = await this.getLeftMatchDuration();
                this.say(`Match ends ${date_fns_1.formatDistanceToNow(date_fns_1.addSeconds(new Date(), leftMatchDuration), { addSuffix: true })}`);
            }
        }
    }
    async onMatchChangeMap() {
        this.tempCurrentPlayers = (await this.getIngamePlayers()).map((p) => p.id);
        this.mapVote.onMatchEnd();
    }
    async onJoin(id) {
        const server = this.options.name;
        const player = await this.getPlayerToCache(id);
        const admin = this.admins.has(player.id);
        if (await this.bot.whitelist.check(this, player))
            return;
        if (this.options.automod) {
            const profaneWords = await this.bot.antiSlur.getSlurs(this, player, player.name);
            if (profaneWords && (profaneWords === null || profaneWords === void 0 ? void 0 : profaneWords.length) > 0) {
                await this.kickUser(this.options.name, {
                    ids: { playFabID: "1337" },
                    id: "1337",
                    name: this.options.name,
                }, player, `Your username contains profane words (${profaneWords.join(", ")}), change it.`);
                Discord_1.sendWebhookMessage(this.webhooks.get("automod"), `Kicked ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) for having a username with profane words (${profaneWords.join(", ")}).`);
                return;
            }
        }
        if (admin &&
            Config_1.default.get("servers").find((s) => s.name === this.options.name).rcon
                .saveAdminActivity) {
            const currentDate = new Date().toISOString().slice(0, 10);
            const adminActivityPath = `admins.${player.id}`;
            const adminActivity = AdminActivityConfig_1.default.get(adminActivityPath);
            StatsConfig_1.default.set(`admins.${player.id}.name`, player.name);
            if (adminActivity) {
                const activityTodayPath = `admins.${player.id}.servers.${this.options.name}.activity.${currentDate}`;
                const activityToday = AdminActivityConfig_1.default.get(activityTodayPath);
                if (activityToday) {
                    AdminActivityConfig_1.default.set(`admins.${player.id}.name`, player.name);
                    AdminActivityConfig_1.default.set(`${activityTodayPath}.startedAt`, new Date().getTime());
                }
                else {
                    AdminActivityConfig_1.default.set(activityTodayPath, {
                        startedAt: new Date().getTime(),
                        endedAt: 0,
                        duration: 0,
                    });
                }
            }
            else {
                AdminActivityConfig_1.default.set(adminActivityPath, {
                    name: player.name,
                    servers: {
                        [server]: {
                            activity: {
                                [currentDate]: {
                                    startedAt: new Date().getTime(),
                                    endedAt: 0,
                                    duration: 0,
                                },
                            },
                        },
                    },
                });
            }
        }
        this.bot.cachedPlayers.set(player.id, {
            ...this.bot.cachedPlayers.get(player.id),
            ...deep_cleaner_1.default(player),
            server,
        });
        const history = (await this.bot.database.getPlayerHistory([
            player.ids.playFabID,
            player.ids.steamID,
        ])).history;
        const bans = history.filter((log) => log.type === "BAN").length;
        const totalDuration = history
            .filter((h) => !new bignumber_js_1.default(h.duration).isNaN())
            .reduce((a, b) => a.plus(new bignumber_js_1.default(b.duration)), new bignumber_js_1.default(0));
        if (!this.tempCurrentPlayers.includes(player.id)) {
            logger_1.default.info("Server", `${admin ? "Admin" : "Player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) has joined the server (Server: ${server}${bans > 0
                ? `, Bans: ${bans}, Total Duration: ${pluralize_1.default("minute", totalDuration.toNumber(), true)}`
                : ""})`);
        }
        if (process.env.NODE_ENV.trim() === "production" &&
            !this.tempCurrentPlayers.includes(player.id))
            Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `${admin ? "Admin" : "Player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has joined the server (Server: ${server}${bans > 0
                ? `, Bans: ${bans}, Total Duration: ${pluralize_1.default("minute", totalDuration.toNumber(), true)}`
                : ""})`);
        if (bans < 3)
            return;
        if (!this.bot.naughtyPlayers.has(player.id)) {
            this.bot.naughtyPlayers.set(player.id, this.bot.cachedPlayers.get(player.id) ||
                (await this.getPlayerToCache(player.id)));
        }
        if (!this.tempCurrentPlayers.includes(player.id)) {
            logger_1.default.info("Server", `Naughty ${admin ? "admin" : "player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) has joined with ${bans} bans a total duration of ${pluralize_1.default("minute", totalDuration.toNumber(), true)} (Server: ${server})`);
        }
        if (process.env.NODE_ENV.trim() === "production" &&
            !this.tempCurrentPlayers.includes(player.id))
            Discord_1.sendWebhookMessage(this.webhooks.get("wanted"), `Naughty ${admin ? "admin" : "player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has joined with ${bans} bans a total duration of ${pluralize_1.default("minute", totalDuration.toNumber(), true)} (Server: ${server})`);
    }
    async onLeave(id) {
        const server = this.options.name;
        const player = this.bot.cachedPlayers.get(id) || (await this.getPlayerToCache(id));
        const admin = this.admins.has(player.id);
        const punishedPlayer = this.bot.punishedPlayers.get(player.id);
        if (admin &&
            Config_1.default.get("servers").find((s) => s.name === this.options.name).rcon
                .saveAdminActivity) {
            const currentDate = new Date().toISOString().slice(0, 10);
            const adminActivityPath = `admins.${player.id}`;
            const adminActivity = AdminActivityConfig_1.default.get(adminActivityPath);
            StatsConfig_1.default.set(`admins.${player.id}.name`, player.name);
            if (adminActivity) {
                const activityTodayPath = `admins.${player.id}.servers.${this.options.name}.activity.${currentDate}`;
                const activityToday = AdminActivityConfig_1.default.get(activityTodayPath);
                if (activityToday) {
                    AdminActivityConfig_1.default.set(`${activityTodayPath}.duration`, AdminActivityConfig_1.default.get(`${activityTodayPath}.duration`) +
                        Math.round((new Date().getTime() -
                            (AdminActivityConfig_1.default.get(`${activityTodayPath}.startedAt`) ||
                                new Date(currentDate).getTime())) /
                            1000));
                    AdminActivityConfig_1.default.set(`${activityTodayPath}.endedAt`, new Date().getTime());
                }
                else {
                    AdminActivityConfig_1.default.set(activityTodayPath, {
                        startedAt: new Date().getTime(),
                        endedAt: new Date().getTime(),
                        duration: 0,
                    });
                }
            }
            else {
                AdminActivityConfig_1.default.set(adminActivityPath, {
                    name: player.name,
                    servers: {
                        [server]: {
                            activity: {
                                [currentDate]: {
                                    startedAt: new Date().getTime(),
                                    endedAt: new Date().getTime(),
                                    duration: 0,
                                },
                            },
                        },
                    },
                });
            }
        }
        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);
        this.mapVote.removeVote(player);
        this.bot.punishedPlayers.del(player.id);
        this.bot.naughtyPlayers.del(player.id);
        if (punishedPlayer) {
            logger_1.default.info("Server", `${admin ? "Admin" : "Player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) has been punished (Type: ${punishedPlayer.punishment}, Admin: ${punishedPlayer.admin.name}, Server: ${server})`);
            if (process.env.NODE_ENV.trim() === "production") {
                Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `${admin ? "Admin" : "Player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has been punished (Type: ${punishedPlayer.punishment}, Admin: ${parseOut_1.default(punishedPlayer.admin.name)}, Server: ${server})`);
            }
        }
        else {
            logger_1.default.info("Server", `${admin ? "Admin" : "Player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) has left the server (Server: ${server})`);
            if (process.env.NODE_ENV.trim() === "production") {
                Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `${admin ? "Admin" : "Player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has left the server (Server: ${server})`);
            }
        }
        const naughtyPlayer = this.bot.naughtyPlayers.has(player.id);
        if (naughtyPlayer) {
            if (process.env.NODE_ENV.trim() === "production") {
                if (!punishedPlayer) {
                    logger_1.default.info("Server", `Naughty ${admin ? "admin" : "player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) left the server (Server: ${server})`);
                    Discord_1.sendWebhookMessage(this.webhooks.get("wanted"), `Naughty ${admin ? "admin" : "player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) left the server (Server: ${server})`);
                }
                else {
                    logger_1.default.info("Server", `Naughty ${admin ? "admin" : "player"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) has been punished (Type: ${punishedPlayer.punishment}, Admin: ${punishedPlayer.admin.name}, Server: ${server})`);
                    Discord_1.sendWebhookMessage(this.webhooks.get("wanted"), `Naughty ${admin ? "admin" : "player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) has been punished (Type: ${punishedPlayer.punishment}, Admin: ${parseOut_1.default(punishedPlayer.admin.name)}, Server: ${server})`);
                }
            }
        }
    }
    async onPunishment(adminID, playerID, date, punishment, duration, reason) {
        const admin = this.bot.cachedPlayers.get(adminID) ||
            (await this.getPlayerToCache(adminID));
        const player = this.bot.cachedPlayers.get(playerID) ||
            (await this.getPlayerToCache(playerID));
        if (this.options.adminListSaving && !this.admins.has(adminID)) {
            await this.saveAdmins();
            Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `Unauthorized admin ${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) ${punishment} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)})${["banned", "muted"].includes(punishment)
                ? " and the punishment has beeen reverted"
                : ""}`);
            switch (punishment) {
                case "banned": {
                    this.unbanUser(this.options.name, {
                        ids: { playFabID: "", steamID: "" },
                        id: "",
                        name: "",
                    }, player, false);
                }
                case "muted": {
                    this.unmuteUser(this.options.name, {
                        ids: { playFabID: "", steamID: "" },
                        id: "",
                        name: "",
                    }, player, false);
                }
            }
            return;
        }
        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);
        this.bot.punishedPlayers.del(player.id);
        this.bot.naughtyPlayers.del(player.id);
        switch (punishment) {
            case "kicked": {
                return this.bot.logHandler.kickHandler.execute(this.options.name, date, player, admin, duration, reason);
            }
            case "banned": {
                if (Config_1.default.get("syncServerPunishments"))
                    return this.bot.rcon.globalBan(admin, player, duration, reason, this.options.name);
                this.say(`${player.name} has been banned by an admin.`);
                this.say(`${player.name} has been banned for ${duration && !duration.isEqualTo(0) && !duration.isNaN()
                    ? pluralize_1.default("minute", duration.toNumber(), true)
                    : "PERMANENTLY"} by ${admin.name} (${admin.id}).\nReason: ${reason || "none given"}`, "adminchat");
                return this.bot.logHandler.banHandler.execute(this.options.name, date, player, admin, duration, reason);
            }
            case "unbanned": {
                if (Config_1.default.get("syncServerPunishments"))
                    return this.bot.rcon.globalUnban(admin, player, this.options.name);
                this.say(`${player.name} has been unbanned by an admin.`);
                this.say(`${player.name} has been unbanned by ${admin.name} (${admin.id}).`, "adminchat");
                return this.bot.logHandler.unbanHandler.execute(this.options.name, date, player, admin);
            }
            case "muted": {
                if (Config_1.default.get("syncServerPunishments"))
                    return this.bot.rcon.globalMute(admin, player, duration, this.options.name);
                this.say(`${player.name} has been muted by ${admin.name} (${admin.id}).`, "adminchat");
                return this.bot.logHandler.muteHandler.execute(this.options.name, date, player, admin, duration);
            }
            case "unmuted": {
                if (Config_1.default.get("syncServerPunishments"))
                    return this.bot.rcon.globalUnmute(admin, player, this.options.name);
                this.say(`${player.name} has been unmuted by ${admin.name} (${admin.id}).`, "adminchat");
                return this.bot.logHandler.unmuteHandler.execute(this.options.name, date, player, admin);
            }
        }
    }
    async onKill(winnerID, loserID) {
        const winner = this.bot.cachedPlayers.get(winnerID) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(winnerID)),
        };
        const loser = this.bot.cachedPlayers.get(loserID) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(loserID)),
        };
        if (this.options.killstreaks.enabled)
            this.killStreak.check(winner, loser);
    }
    async onSuicide(id) {
        const player = this.bot.cachedPlayers.get(id) || {
            server: this.options.name,
            ...(await this.getPlayerToCache(id)),
        };
        if (!player)
            return;
        if (this.options.killstreaks.enabled)
            this.killStreak.removeKillstreak(player);
    }
    async reconnect() {
        if (this.reconnecting)
            return;
        logger_1.default.debug("RCON", `Trying to reconnect (Server: ${this.options.name})`);
        this.reconnecting = true;
        setTimeout(async () => {
            try {
                await this.rcon.connect();
            }
            catch (error) {
                if (this.rcon.socket)
                    this.rcon.socket.destroy();
            }
            this.reconnecting = false;
            if (!this.rcon.socket || !this.connected)
                await this.reconnect();
        }, 2500);
    }
    async initialize() {
        this.rcon = new rcon_1.Rcon({
            host: this.options.host,
            port: this.options.port,
            password: this.options.password,
            timeout: 999999999,
        });
        this.rcon.on("connect", () => {
            this.connected = true;
            if (this.timer.isRunning())
                this.timer.stop();
            logger_1.default.info("RCON", `Connection success (Server: ${this.options.name})`);
        });
        this.rcon.on("authenticated", async () => {
            var _a;
            this.authenticated = true;
            logger_1.default.info("RCON", `Auth success (Server: ${this.options.name})`);
            const broadcastEvents = [
                "chat",
                "matchstate",
                "killfeed",
                "login",
                "punishment",
            ];
            const currentBroadcastEvents = await this.send("listenstatus");
            const missingBroadcastEvents = broadcastEvents.filter((event) => !currentBroadcastEvents.includes(event));
            if (broadcastEvents.toString() !== missingBroadcastEvents.toString()) {
                logger_1.default.debug("RCON", `Already listening to ${broadcastEvents
                    .filter((event) => currentBroadcastEvents.includes(event))
                    .join(", ")} by default, will request to listen for: ${missingBroadcastEvents}`);
            }
            else {
                logger_1.default.debug("RCON", "Not listening to events by default");
            }
            for (const event of missingBroadcastEvents) {
                await this.rcon.send(`listen ${event}`);
            }
            await this.getServerInfo();
            await this.updateCache();
            (_a = this.rcon.socket) === null || _a === void 0 ? void 0 : _a.once("end", async () => {
                var _a, _b, _c, _d, _e, _f;
                if (this.connected && this.authenticated)
                    logger_1.default.info("RCON", `Disconnected from server (Server: ${this.options.name})`);
                this.connected = false;
                this.authenticated = false;
                if (!this.timer.isRunning() &&
                    ((_b = (_a = Config_1.default
                        .get("servers")
                        .find((s) => s.name === this.options.name).rcon) === null || _a === void 0 ? void 0 : _a.serverDownNotification) === null || _b === void 0 ? void 0 : _b.channel) &&
                    ((_d = (_c = Config_1.default
                        .get("servers")
                        .find((s) => s.name === this.options.name).rcon) === null || _c === void 0 ? void 0 : _c.serverDownNotification) === null || _d === void 0 ? void 0 : _d.timer))
                    this.timer.start({
                        countdown: true,
                        startValues: {
                            minutes: (_f = (_e = Config_1.default
                                .get("servers")
                                .find((s) => s.name === this.options.name).rcon) === null || _e === void 0 ? void 0 : _e.serverDownNotification) === null || _f === void 0 ? void 0 : _f.timer,
                        },
                    });
                await this.reconnect();
            });
            this.initiate = false;
        });
        this.rcon.on("end", async () => {
            var _a, _b, _c, _d, _e, _f;
            if (this.connected && this.authenticated)
                logger_1.default.info("RCON", `Disconnected from server (Server: ${this.options.name})`);
            this.connected = false;
            this.authenticated = false;
            if (!this.timer.isRunning() &&
                ((_b = (_a = Config_1.default.get("servers").find((s) => s.name === this.options.name)
                    .rcon) === null || _a === void 0 ? void 0 : _a.serverDownNotification) === null || _b === void 0 ? void 0 : _b.channel) &&
                ((_d = (_c = Config_1.default.get("servers").find((s) => s.name === this.options.name)
                    .rcon) === null || _c === void 0 ? void 0 : _c.serverDownNotification) === null || _d === void 0 ? void 0 : _d.timer))
                this.timer.start({
                    countdown: true,
                    startValues: {
                        minutes: (_f = (_e = Config_1.default
                            .get("servers")
                            .find((s) => s.name === this.options.name).rcon) === null || _e === void 0 ? void 0 : _e.serverDownNotification) === null || _f === void 0 ? void 0 : _f.timer,
                    },
                });
            await this.reconnect();
        });
        this.rcon.on("error", (error) => {
            logger_1.default.error("RCON", `An error occurred (Error: ${error.message || error}, Server: ${this.options.name})`);
        });
        this.rcon.on("broadcast", async (data) => {
            var _a, _b, _c, _d, _e, _f, _g;
            logger_1.default.debug("RCON Broadcast", `${data} (Server: ${this.options.name})`);
            if (data.startsWith("Login:")) {
                if (data.endsWith("logged in")) {
                    const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                    const regexParsed = regex.exec(data);
                    if (!regexParsed) {
                        logger_1.default.error("Bot", `Failed to parse the regex for join ${data}`);
                        return;
                    }
                    const id = regexParsed[2];
                    this.onJoin(id);
                }
                if (data.endsWith("logged out")) {
                    const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                    const regexParsed = regex.exec(data);
                    if (!regexParsed) {
                        logger_1.default.error("Bot", `Failed to parse the regex for leave ${data}`);
                        return;
                    }
                    const id = regexParsed[2];
                    this.onLeave(id);
                }
            }
            if (data.startsWith("Punishment: Admin")) {
                const string = data.replace("Punishment: Admin", "");
                const d = string.match(/(.*)player(.*)/);
                const s1 = d[1].split(" ");
                const s2 = d[2].split(" ");
                const punishment = s1[s1.length - 2];
                const adminID = s1[s1.length - 3].replace(/\(|\)/g, "");
                const playerID = s2[1];
                const duration = new bignumber_js_1.default((_a = string.split(": ")[1]) === null || _a === void 0 ? void 0 : _a.split(", ")[0].replace(")", ""));
                const reason = (_b = string.split(": ")[2]) === null || _b === void 0 ? void 0 : _b.replace(")", "");
                if (d[1].includes("failed"))
                    return;
                if (punishment === "kicked" &&
                    (reason === "Vote kick." || reason === "Server is full."))
                    return;
                this.onPunishment(adminID, playerID, new Date(), punishment, duration, reason);
            }
            if (data.startsWith("Chat:")) {
                const line = data
                    .split(": ")[1]
                    .split(", ")
                    .map((string) => string.trim());
                const id = line[0];
                let message = line.slice(2).join(" ");
                message = message.substr(message.indexOf(")") + 2, message.length);
                const player = this.bot.cachedPlayers.get(id) || {
                    server: this.options.name,
                    ...(await this.getPlayerToCache(id)),
                };
                if (!player)
                    return;
                const admin = this.admins.has(player.id);
                await Discord_1.sendWebhookMessage(this.webhooks.get("chat"), `${admin ? "Admin" : "Player"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}): \`${parseOut_1.default(message)}\` (Server: ${this.options.name})`);
                if (this.options.automod) {
                    await this.bot.antiSlur.check(this, player, message);
                }
                if (!message.startsWith(Config_1.default.get("ingamePrefix")))
                    return;
                const args = message
                    .slice(Config_1.default.get("ingamePrefix").length)
                    .trim()
                    .split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = this.bot.RCONCommands.find((c) => [c.meta.name, ...c.meta.aliases].includes(commandName));
                if (!command)
                    return;
                if (command.meta.adminsOnly && !this.admins.has(id))
                    return this.say("Permission denied");
                if (![
                    "teleport",
                    "teleportwith",
                    "votemap",
                    "cancelmapvote",
                ].includes(command.meta.name) &&
                    !Config_1.default
                        .get("servers")
                        .find((server) => server.name === this.options.name)
                        .rcon.ingameCommands.includes(command.meta.name))
                    return;
                if ((command.meta.name === "teleport" ||
                    command.meta.name === "teleportwith") &&
                    !((_d = (_c = Config_1.default
                        .get("servers")
                        .find((server) => server.name === this.options.name)) === null || _c === void 0 ? void 0 : _c.rcon) === null || _d === void 0 ? void 0 : _d.teleportSystem))
                    return;
                if ((command.meta.name === "votemap" ||
                    command.meta.name === "cancelmapvote") &&
                    !((_g = (_f = (_e = Config_1.default
                        .get("servers")
                        .find((server) => server.name === this.options.name)) === null || _e === void 0 ? void 0 : _e.rcon) === null || _f === void 0 ? void 0 : _f.mapVote) === null || _g === void 0 ? void 0 : _g.enabled))
                    return;
                logger_1.default.info("Ingame Command", `${player.name} ran ${command.meta.name}`);
                command.execute(new RCONCommandContext_1.default(command, this.bot, this, player, message, args));
            }
            if (data.startsWith("MatchState: ")) {
                logger_1.default.debug("MatchState", data.replace("MatchState: ", ""));
                if (this.currentMatchState !== "waiting-to-start" &&
                    !data.startsWith("Leaving map")) {
                    return;
                }
                if (data.startsWith("Waiting to start")) {
                    this.currentMatchState = "waiting-to-start";
                    this.onMatchWaitingToStart();
                }
                if (data.includes("In progress")) {
                    this.currentMatchState = "in-progress";
                    this.onMatchStart();
                }
                if (data.includes("Leaving map")) {
                    this.currentMatchState = "leaving-map";
                    this.onMatchChangeMap();
                }
                if (this.webhooks.get("activity")) {
                    await Discord_1.sendWebhookMessage(this.webhooks.get("activity"), `**${data}**${data.includes("Leaving map")
                        ? `, ${pluralize_1.default("player", this.tempCurrentPlayers.length, true)} still on server`
                        : ""}`);
                }
            }
            if (data.includes("Killfeed:") && data.includes("killed")) {
                function parseMessage(message) {
                    const modifiedMessage = message
                        .replace(/(?<=\()(?:[^()]+|\([^)]+\))/g, "")
                        .replace(/\(|\)/g, "")
                        .split(" killed ")
                        .map((id) => id.trim());
                    const winnerID = modifiedMessage[0];
                    const loserID = modifiedMessage[1];
                    if (!winnerID || !loserID) {
                        logger_1.default.debug("RCON", `Failed to parse kill message (WinnerID: ${winnerID}, LoserID: ${loserID})`);
                        return null;
                    }
                    return {
                        winnerID,
                        loserID,
                    };
                }
                const message = data.split(": ")[2];
                const killFeed = parseMessage(message);
                if (!killFeed)
                    return;
                this.onKill(killFeed.winnerID, killFeed.loserID);
            }
            else if (data.includes("Killfeed:") &&
                data.includes("committed suicide")) {
                function parseMessage(message) {
                    const modifiedMessage = message
                        .replace(/(?<=\()(?:[^()]+|\([^)]+\))/g, "")
                        .replace(/\(|\)/g, "")
                        .split(" ");
                    const playerID = modifiedMessage[0];
                    return playerID;
                }
                const message = data.split(": ")[2];
                const playerID = parseMessage(message);
                this.onSuicide(playerID);
            }
        });
        clearInterval(this.keepAlive);
        this.keepAlive = setInterval(() => {
            this.send("alive")
                .then((response) => {
                if (response === "Not connected")
                    throw new Error("Not connected");
                logger_1.default.debug("RCON", `Keepalive success (Server: ${this.options.name})`);
                this.saveAdmins();
            })
                .catch(async (err) => {
                logger_1.default.debug("RCON", `Keepalive failed (Error: ${err.message || err}, Server: ${this.options.name})`);
                await this.reconnect();
            });
        }, 30000);
        try {
            await this.rcon.connect();
        }
        catch (error) {
            logger_1.default.error("RCON", `An error occurred while connecting (Error: ${error.message || error}, Server: ${this.options.name})`);
            await this.reconnect();
        }
    }
}
exports.default = Rcon;
