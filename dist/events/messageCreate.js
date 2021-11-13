"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fuse_js_1 = __importDefault(require("fuse.js"));
const playfab_sdk_1 = require("playfab-sdk");
const util_1 = require("util");
const PlayFab_1 = require("../services/PlayFab");
const AdminActivityConfig_1 = __importDefault(require("../structures/AdminActivityConfig"));
const BaseEvent_1 = __importDefault(require("../structures/BaseEvent"));
const Config_1 = __importDefault(require("../structures/Config"));
const StatsConfig_1 = __importDefault(require("../structures/StatsConfig"));
const GetServerList = util_1.promisify(playfab_sdk_1.PlayFabClient.GetCurrentGames);
class messageCreate extends BaseEvent_1.default {
    async execute(bot, message) {
        var _a, _b;
        if (message.author.id === bot.client.user.id || !message.author.bot)
            return;
        if (message.embeds.length) {
            if (Config_1.default.get("servers").find((s) => {
                var _a, _b;
                return ((_b = (_a = s.rcon) === null || _a === void 0 ? void 0 : _a.stats) === null || _b === void 0 ? void 0 : _b.adminActionWebhookChannel) ===
                    message.channel.id;
            })) {
                const embed = message.embeds[0];
                if (!embed)
                    return;
                if (embed.title === "Admin Action" &&
                    embed.description.includes("**Command:**")) {
                    const currentDate = new Date().toISOString().slice(0, 10);
                    const lines = embed.description.split("\n");
                    const command = lines
                        .find((l) => l.includes("**Command:**"))
                        .split("**Command:** ")[1]
                        .toLowerCase();
                    let server = lines
                        .find((l) => l.includes("**Server:**"))
                        .split("**Server:** ")[1];
                    server = (_b = (_a = new fuse_js_1.default(await bot.rcon.getServersInfo(), {
                        threshold: 0.4,
                        keys: [
                            {
                                name: "data.name",
                                weight: 1,
                            },
                        ],
                    }).search(server)[0]) === null || _a === void 0 ? void 0 : _a.item) === null || _b === void 0 ? void 0 : _b.server;
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
        else if (Config_1.default.get("servers").find((s) => {
            var _a, _b;
            return ((_b = (_a = s.rcon) === null || _a === void 0 ? void 0 : _a.stats) === null || _b === void 0 ? void 0 : _b.serverLagReportsWebhookChannel) ===
                message.channel.id;
        })) {
            return;
        }
    }
}
exports.default = messageCreate;
