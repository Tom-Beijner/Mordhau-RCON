"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PlayFab_1 = require("../services/PlayFab");
const AdminActivityConfig_1 = __importDefault(require("../structures/AdminActivityConfig"));
const BaseEvent_1 = __importDefault(require("../structures/BaseEvent"));
const Config_1 = __importDefault(require("../structures/Config"));
const StatsConfig_1 = __importDefault(require("../structures/StatsConfig"));
class messageCreate extends BaseEvent_1.default {
    async execute(bot, message) {
        var _a, _b, _c, _d, _e, _f;
        if (message.author.id === bot.client.user.id || !message.author.bot)
            return;
        if (message.embeds.length) {
            if (Config_1.default.get("servers").find((s) => s.rcon.stats.adminActionWebhookChannel ===
                message.channel.id)) {
                const embed = message.embeds[0];
                if (!embed)
                    return;
                if (embed.title === "Admin Action" &&
                    embed.description.includes("**Command:**")) {
                    console.log(message.embeds[0].title);
                    const currentDate = new Date().toISOString().slice(0, 10);
                    const lines = embed.description.split("\n");
                    const command = lines
                        .find((l) => l.includes("**Command:**"))
                        .split("**Command:** ")[1]
                        .toLowerCase();
                    let server = lines
                        .find((l) => l.includes("**Server:**"))
                        .split("**Server:** ")[1];
                    server =
                        ((_b = (_a = (await bot.rcon.getServersInfo()).find((s) => { var _a; return ((_a = s === null || s === void 0 ? void 0 : s.data) === null || _a === void 0 ? void 0 : _a.name) === server; })) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.name) ||
                            ((_f = (_e = (_d = (_c = Config_1.default.get("servers").find((s) => {
                                var _a, _b, _c;
                                return ((_c = (_b = (_a = s === null || s === void 0 ? void 0 : s.rcon) === null || _a === void 0 ? void 0 : _a.status) === null || _b === void 0 ? void 0 : _b.fallbackValues) === null || _c === void 0 ? void 0 : _c.serverName) ===
                                    server;
                            })) === null || _c === void 0 ? void 0 : _c.rcon) === null || _d === void 0 ? void 0 : _d.status) === null || _e === void 0 ? void 0 : _e.fallbackValues) === null || _f === void 0 ? void 0 : _f.serverName);
                    if (!server)
                        return;
                    const adminParse = lines.find((l) => l.includes("**Admin:**"));
                    const adminID = adminParse
                        .split(" ")
                        .pop()
                        .replace(/[()]/g, "");
                    const admin = bot.cachedPlayers.get(adminID) ||
                        (await PlayFab_1.LookupPlayer(adminID));
                    StatsConfig_1.default.set(`admins.${adminID}.name`, admin.name);
                    StatsConfig_1.default.set(`admins.${adminID}.servers.${server}.adminActions.${currentDate}.${command}`, StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions.${currentDate}.${command}`, 0) + 1);
                    AdminActivityConfig_1.default.set(`admins.${admin.id}.name`, admin.name);
                }
            }
        }
        else if (Config_1.default.get("servers").find((s) => s.rcon.stats.serverLagReportsWebhookChannel ===
            message.channel.id)) {
            return;
        }
    }
}
exports.default = messageCreate;
