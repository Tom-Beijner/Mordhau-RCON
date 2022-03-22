"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const conf_1 = __importDefault(require("conf"));
const pluralize_1 = __importDefault(require("pluralize"));
const retext_english_1 = __importDefault(require("retext-english"));
const factory_js_1 = __importDefault(require("retext-profanities/factory.js"));
const retext_stringify_1 = __importDefault(require("retext-stringify"));
const unified_1 = __importDefault(require("unified"));
const Discord_1 = require("../services/Discord");
const logger_1 = __importDefault(require("../utils/logger"));
const parseOut_1 = __importDefault(require("../utils/parseOut"));
const PlayerID_1 = require("../utils/PlayerID");
const Config_1 = __importDefault(require("./Config"));
class AutoMod {
    constructor(bot, options) {
        this.options = options || {
            name: "AutoMod",
        };
        this.bot = bot;
        const config = new conf_1.default({
            configName: "bannedWords",
            cwd: "./",
            accessPropertiesByDotNotation: true,
            schema: {
                words: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    minItems: 1,
                    uniqueItems: true,
                },
            },
            defaults: {
                words: [
                    "beaners",
                    "beaner",
                    "bimbo",
                    "coon",
                    "coons",
                    "cunt",
                    "cunts",
                    "darkie",
                    "darkies",
                    "fag",
                    "fags",
                    "faggot",
                    "faggots",
                    "gook",
                    "hooker",
                    "kike",
                    "kikes",
                    "nazi",
                    "nazis",
                    "neonazi",
                    "neonazis",
                    "negro",
                    "negros",
                    "nigga",
                    "niggas",
                    "nigger",
                    "niggers",
                    "niglet",
                    "paki",
                    "pakis",
                    "raghead",
                    "ragheads",
                    "shemale",
                    "shemales",
                    "slut",
                    "sluts",
                    "spic",
                    "spics",
                    "swastika",
                    "towelhead",
                    "towelheads",
                    "tranny",
                    "trannys",
                    "trannies",
                    "twink",
                    "twinks",
                    "wetback",
                    "wetbacks",
                ],
            },
        });
        this.profaneWords = config.get("words");
        this.stringChecker = unified_1.default()
            .use(retext_english_1.default)
            .use(factory_js_1.default({
            lang: "en",
            cuss: this.profaneWords.reduce((result, word) => {
                result[word] = 1;
                return result;
            }, {}),
            pluralize: require("pluralize"),
            ignorePluralize: [
                "children",
                "dy",
                "pro",
                "so",
                "dice",
                "fus",
            ],
            regular: ["hell"],
        }))
            .use(retext_stringify_1.default);
    }
    sendMessage(webhookCredentials, message) {
        return Discord_1.sendWebhookMessage(webhookCredentials, message);
    }
    async getSlurs(rcon, player, message) {
        if (Config_1.default.get("automod.adminsBypass") && rcon.admins.has(player.id))
            return;
        const result = await this.stringChecker.process(message);
        if (!result.messages.length)
            return;
        return result.messages.map((word) => word.ruleId);
    }
    async check(rcon, player, message) {
        var _a;
        if (Config_1.default.get("automod.adminsBypass") && rcon.admins.has(player.id))
            return;
        const result = await this.stringChecker.process(message);
        if (!result.messages.length)
            return;
        const profaneWords = result.messages.map((word) => word.ruleId);
        logger_1.default.debug(this.options.name, `${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) sent a profane message (Server: ${rcon.options.name}, Message: ${message}, Profane words: ${profaneWords.join(", ")})`);
        const playerMessages = await this.bot.database.Infractions.findOneAndUpdate({ id: player.id }, { $inc: { infractions: 1 }, $push: { words: profaneWords } }, { new: true, upsert: true });
        const allProfaneWords = array_prototype_flatmap_1.default(playerMessages.words, (words) => words).join(", ");
        const infractionThresholds = Config_1.default.get("automod.infractionThresholds");
        const highestInfractionThreshold = parseInt(Object.keys(infractionThresholds).reduce((a, b) => parseInt(a) > parseInt(b) ? a : b));
        const infractionIteration = playerMessages.infractions / highestInfractionThreshold;
        function onlyDecimals(value) {
            value = Math.abs(value);
            return Number((value - Math.floor(value)).toFixed(3));
        }
        function compareDecimals(first, second) {
            return onlyDecimals(first) === onlyDecimals(second);
        }
        for (const infractionsThreshhold in infractionThresholds) {
            if (compareDecimals(parseInt(infractionsThreshhold) /
                highestInfractionThreshold, infractionIteration)) {
                const punishment = Config_1.default.get(`automod.infractionThresholds.${infractionsThreshhold}`);
                const server = (_a = this.bot.cachedPlayers.get(player.id)) === null || _a === void 0 ? void 0 : _a.server;
                const admin = {
                    ids: { playFabID: "1337" },
                    id: "1337",
                    name: this.options.name,
                };
                const message = punishment.message
                    .replace(/{name}/g, player.name)
                    .replace(/{words}/g, allProfaneWords);
                const reason = `${this.options.name}: ${punishment.reason}`
                    .replace(/{name}/g, player.name)
                    .replace(/{words}/g, allProfaneWords);
                const duration = new bignumber_js_1.default(infractionIteration > 1
                    ? punishment.duration * Math.ceil(infractionIteration)
                    : punishment.duration);
                switch (punishment.type) {
                    case "message": {
                        await rcon.say(`${this.options.name}: ${message}`);
                        break;
                    }
                    case "mute": {
                        const error = await rcon.muteUser(server, admin, player, duration);
                        if (error) {
                            logger_1.default.error(this.options.name, `Error occurred while muting ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await rcon.say(`${this.options.name}: ${message}`);
                        }
                        break;
                    }
                    case "kick": {
                        const error = await rcon.kickUser(server, admin, player, reason);
                        if (error) {
                            logger_1.default.error(this.options.name, `Error occurred while kicking ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await rcon.say(`${this.options.name}: ${message}`);
                        }
                        break;
                    }
                    case "ban": {
                        const error = await rcon.banUser(server, admin, player, duration, reason);
                        if (error) {
                            logger_1.default.error(this.options.name, `Error occurred while banning ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (${error})`);
                        }
                        else {
                            await rcon.say(`${this.options.name}: ${message}`);
                        }
                        break;
                    }
                    case "globalmute": {
                        const result = await this.bot.rcon.globalMute(admin, player, duration);
                        const failedServers = result.filter((result) => result.data.failed);
                        if (failedServers.length) {
                            logger_1.default.error(this.options.name, `Error occurred while globally muting ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (Failed to mute on ${pluralize_1.default("server", failedServers.length)}: ${failedServers
                                .map((server) => `${server.name} (${server.data.result})`)
                                .join(", ")})`);
                        }
                        else {
                            await rcon.say(`${this.options.name}: ${message}`);
                        }
                        break;
                    }
                    case "globalban": {
                        const result = await this.bot.rcon.globalBan(admin, player, duration, reason);
                        const failedServers = result.filter((result) => result.data.failed);
                        if (failedServers.length) {
                            logger_1.default.error(this.options.name, `Error occurred while globally banning ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) (Failed to ban on ${pluralize_1.default("server", failedServers.length)}: ${failedServers
                                .map((server) => `${server.name} (${server.data.result})`)
                                .join(", ")})`);
                        }
                        else {
                            await rcon.say(`${this.options.name}: ${message}`);
                        }
                        break;
                    }
                }
                this.sendMessage(rcon.webhooks.get("automod"), `${punishment.type === "globalban"
                    ? "Globally ban"
                    : punishment.type === "globalmute"
                        ? "Globally mute"
                        : punishment.type[0].toUpperCase() +
                            punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                    ? "ned"
                    : ["warn", "kick"].includes(punishment.type)
                        ? "ed"
                        : "d"} ${parseOut_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) for profane message (Server: ${rcon.options.name}${duration
                    ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                    : ""}, Threshold: ${infractionsThreshhold}, Messages: ${playerMessages.infractions}, Profane words: ${allProfaneWords})`);
                logger_1.default.info(this.options.name, `${punishment.type === "globalban"
                    ? "Globally ban"
                    : punishment.type === "globalmute"
                        ? "Globally mute"
                        : punishment.type[0].toUpperCase() +
                            punishment.type.substr(1)}${["ban", "globalban"].includes(punishment.type)
                    ? "ned"
                    : ["warn", "kick"].includes(punishment.type)
                        ? "ed"
                        : "d"} ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) for profane message (Server: ${rcon.options.name}${duration
                    ? `, Duration: ${pluralize_1.default("minute", duration.toNumber(), true)}`
                    : ""}, Threshold: ${infractionsThreshhold}, Messages: ${playerMessages.infractions}, Profane words: ${allProfaneWords})`);
                if (Config_1.default.get("automod.infiniteDurationScaling"))
                    return;
                if (parseInt(infractionsThreshhold) >=
                    highestInfractionThreshold) {
                    await this.bot.database.Infractions.deleteOne({
                        id: player.id,
                    });
                    logger_1.default.info(this.options.name, `Reset ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids)}) infractions`);
                }
                return;
            }
        }
    }
}
exports.default = AutoMod;
