"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conf_1 = __importDefault(require("conf"));
const Discord_1 = require("../services/Discord");
const logger_1 = __importDefault(require("../utils/logger"));
const parseOut_1 = __importDefault(require("../utils/parseOut"));
const PlayerID_1 = require("../utils/PlayerID");
class AutoMod {
    constructor(bot) {
        this.config = new conf_1.default({
            configName: "whitelist",
            cwd: "./",
            accessPropertiesByDotNotation: true,
            schema: {
                servers: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                            enabled: {
                                type: "boolean",
                            },
                        },
                    },
                },
                players: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                            },
                            server: {
                                type: "string",
                            },
                        },
                    },
                },
            },
            defaults: {
                servers: [],
                players: [],
            },
        });
        this.bot = bot;
    }
    sendMessage(webhookCredentials, message) {
        return Discord_1.sendWebhookMessage(webhookCredentials, message);
    }
    async check(rcon, player) {
        const server = this.config.get("servers").find((s) => s.name === rcon.options.name);
        if (!(server && server.enabled) ||
            rcon.admins.has(player.id) ||
            this.config.get("players").find((p) => p.id === player.id && p.server === rcon.options.name)) {
            return false;
        }
        await rcon.send(`kick ${player.id} You are not whitelisted on this server.`);
        this.sendMessage(rcon.webhooks.get("activity"), `${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) was kicked for not being whitelisted (Server: ${rcon.options.name})`);
        logger_1.default.info("Whitelist", `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) was kicked for not being whitelisted (Server: ${rcon.options.name})`);
        return true;
    }
    async on(rcon, admin) {
        const server = this.config.get("servers").find((s) => s.name === rcon.options.name);
        if (server && server.enabled) {
            return `${rcon.options.name} is already enabled.`;
        }
        this.config.set("servers", [
            ...this.config.get("servers"),
            {
                name: rcon.options.name,
                enabled: true,
            },
        ]);
        rcon.say(`Whitelist has been enabled`);
        this.sendMessage(rcon.webhooks.get("activity"), `${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) enabled the whitelist (Server: ${rcon.options.name})`);
        logger_1.default.info("Whitelist", `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)}) enabled the whitelist (Server: ${rcon.options.name})`);
    }
    async off(rcon, admin) {
        const server = this.config.get("servers").find((s) => s.name === rcon.options.name);
        if (server && !server.enabled) {
            return `${rcon.options.name} is already disabled.`;
        }
        this.config.set("servers", this.config.get("servers").filter((s) => s.name !== rcon.options.name));
        rcon.say(`Whitelist has been disabled`);
        this.sendMessage(rcon.webhooks.get("activity"), `${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) disabled the whitelist (Server: ${rcon.options.name})`);
        logger_1.default.info("Whitelist", `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)}) disabled the whitelist (Server: ${rcon.options.name})`);
    }
    async list(rcon) {
        return this.config.get("players").filter((p) => p.server === rcon.options.name);
    }
    async add(rcon, admin, player) {
        if (this.config.get("players").find((p) => p.id === player.id && p.server === rcon.options.name)) {
            return `${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) is already whitelisted.`;
        }
        this.config.set("players", [
            ...this.config.get("players"),
            {
                id: player.id,
                server: rcon.options.name,
            },
        ]);
        rcon.say(`${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) was whitelisted.`);
        this.sendMessage(rcon.webhooks.get("activity"), `${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) added ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) to the whitelist (Server: ${rcon.options.name})`);
        logger_1.default.info("Whitelist", `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)}) added ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) to the whitelist (Server: ${rcon.options.name})`);
    }
    async remove(rcon, admin, player) {
        if (!this.config.get("players").find((p) => p.id === player.id && p.server === rcon.options.name)) {
            return `${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) is not whitelisted.`;
        }
        this.config.set("players", this.config.get("players").filter((p) => p.id !== player.id && p.server !== rcon.options.name));
        rcon.say(`${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) was removed from the whitelist.`);
        this.sendMessage(rcon.webhooks.get("activity"), `${parseOut_1.default(admin.name)} (${PlayerID_1.outputPlayerIDs(admin.ids, true)}) removed ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) from the whitelist (Server: ${rcon.options.name})`);
        logger_1.default.info("Whitelist", `${admin.name} (${PlayerID_1.outputPlayerIDs(admin.ids)}) removed ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) from the whitelist (Server: ${rcon.options.name})`);
    }
}
exports.default = AutoMod;
