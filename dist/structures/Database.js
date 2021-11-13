"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const infractionsSchema_1 = __importDefault(require("../models/infractionsSchema"));
const logSchema_1 = __importDefault(require("../models/logSchema"));
const warnsSchema_1 = __importDefault(require("../models/warnsSchema"));
const logger_1 = __importDefault(require("../utils/logger"));
const PlayerID_1 = require("../utils/PlayerID");
class Database {
    constructor(options) {
        this.options = options;
    }
    async connect() {
        const uri = `mongodb+srv://${this.options.username}:${this.options.password}@${this.options.host}/${this.options.database}`;
        await mongoose_1.default.connect(uri, {
            useNewUrlParser: true,
            socketTimeoutMS: 0,
            keepAlive: true,
            keepAliveInitialDelay: 300000,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        });
        return this;
    }
    get Logs() {
        return logSchema_1.default;
    }
    get Infractions() {
        return infractionsSchema_1.default;
    }
    get Warns() {
        return warnsSchema_1.default;
    }
    async getPlayerHistory(platformIDs, searchForAdmin, filter = {}) {
        var _a, _b;
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const platforms = platformIDs.map((id) => PlayerID_1.parsePlayerID(id));
        const searchIDs = platformIDs;
        const playerhistoryData = await this.Logs.find({
            $or: [
                searchForAdmin
                    ? {
                        admin: { $regex: searchIDs.join("|") },
                    }
                    : {
                        "ids.id": { $in: searchIDs },
                    },
                { id: { $in: [...new Set(searchIDs)] } },
            ],
            ...filter,
        });
        if (playerhistoryData.length)
            logger_1.default.debug("Bot", searchForAdmin
                ? `Punishment history (IDs: ${platforms
                    .map((p) => `${p.platform}:${p.id}`)
                    .join(",")})`
                : `History found (IDs: ${platforms
                    .map((p) => `${p.platform}:${p.id}`)
                    .join(",")})`);
        else
            logger_1.default.debug("Bot", searchForAdmin
                ? `No punishment history data was found (IDs: ${platforms
                    .map((p) => `${p.platform}:${p.id}`)
                    .join(",")})`
                : `No history data was found (IDs: ${platforms
                    .map((p) => `${p.platform}:${p.id}`)
                    .join(",")})`);
        let previousNames = playerhistoryData
            .map((h) => h.player)
            .filter((h) => typeof h === "string");
        if (previousNames.length)
            previousNames = [...new Set(previousNames)].join(", ");
        else
            previousNames = "";
        return {
            ids: {
                playFabID: (_a = platforms.find((platform) => platform.platform === "PlayFab")) === null || _a === void 0 ? void 0 : _a.id,
                steamID: (_b = platforms.find((platform) => platform.platform === "Steam")) === null || _b === void 0 ? void 0 : _b.id,
            },
            previousNames,
            history: playerhistoryData,
        };
    }
    async deletePlayerHistory(platformIDs, searchForAdmin) {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs = [...platformIDs];
        return await this.Logs.deleteMany({
            $or: [
                searchForAdmin
                    ? {
                        admin: { $regex: searchIDs.join("|") },
                    }
                    : {
                        "ids.id": { $in: searchIDs },
                    },
                { id: { $in: [...new Set(searchIDs)] } },
            ],
        });
    }
    async getPlayerPunishment(platformIDs, punishmentIDs, searchForAdmin) {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs = [...platformIDs];
        const playerPunishmentData = await this.Logs.find({
            $or: [
                searchForAdmin
                    ? {
                        _id: { $in: punishmentIDs },
                        admin: { $regex: searchIDs.join("|") },
                    }
                    : {
                        _id: { $in: punishmentIDs },
                        "ids.id": { $in: searchIDs },
                    },
                {
                    _id: { $in: punishmentIDs },
                    id: { $in: [...new Set(searchIDs)] },
                },
            ],
        });
        if (playerPunishmentData)
            logger_1.default.debug("Bot", searchForAdmin
                ? `Punishment history (IDs: ${searchIDs.join(",")})`
                : `History found (IDs: ${searchIDs.join(",")})`);
        else
            logger_1.default.debug("Bot", searchForAdmin
                ? `No punishment history data was found (IDs: ${searchIDs.join(",")})`
                : `No history data was found (IDs: ${searchIDs.join(",")})`);
        return playerPunishmentData;
    }
    async deletePlayerPunishment(platformIDs, punishmentIDs, searchForAdmin) {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs = [...platformIDs];
        return await this.Logs.deleteMany({
            $or: [
                searchForAdmin
                    ? {
                        _id: { $in: punishmentIDs },
                        admin: { $regex: searchIDs.join("|") },
                    }
                    : {
                        _id: { $in: punishmentIDs },
                        "ids.id": { $in: searchIDs },
                    },
                {
                    _id: { $in: punishmentIDs },
                    id: { $in: [...new Set(searchIDs)] },
                },
            ],
        });
    }
    async updatePlayerHistory(data) {
        logger_1.default.debug("Bot", `Going to save punishment (Player: ${data.player}, Type: ${data.type}, Admin: ${data.admin}, Duration: ${data.duration}, Server: ${data.server})`);
        if (process.env.NODE_ENV.trim() === "production")
            await this.Logs.create(data);
    }
    close() {
        return mongoose_1.default.connection.close();
    }
}
exports.default = Database;
