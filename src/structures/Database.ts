import BigNumber from "bignumber.js";
import mongoose, { ObjectId } from "mongoose";
import infractionsSchema from "../models/infractionsSchema";
import logSchema, { ILog, platforms } from "../models/logSchema";
import warnsSchema from "../models/warnsSchema";
import logger from "../utils/logger";
import { parsePlayerID } from "../utils/PlayerID";

interface Options {
    host: string;
    database: string;
    username: string;
    password: string;
}

export default class Database {
    private options: Options;
    constructor(options: Options) {
        this.options = options;
    }

    public async connect() {
        const uri = `mongodb+srv://${this.options.username}:${this.options.password}@${this.options.host}/${this.options.database}`;
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            socketTimeoutMS: 0,
            keepAlive: true,
            keepAliveInitialDelay: 300000,
            // reconnectTries: 30,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        });

        return this;
    }

    public get Logs() {
        return logSchema;
    }

    public get Infractions() {
        return infractionsSchema;
    }

    public get Warns() {
        return warnsSchema;
    }

    async getPlayerHistory(
        platformIDs: string[],
        searchForAdmin?: boolean
    ): Promise<{
        ids: {
            playFabID?: string;
            steamID?: string;
        };
        previousNames: string;
        history: ILog[];
    }> {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const platforms = platformIDs.map((id) => parsePlayerID(id));
        const searchIDs: string[] = platformIDs;

        const playerhistoryData = await this.Logs.find({
            $or: [
                searchForAdmin
                    ? {
                          admin: { $regex: searchIDs.join("|") },
                      }
                    : {
                          // "ids.platform": { $in: searchPlatforms },
                          "ids.id": { $in: searchIDs },
                      },
                { id: { $in: [...new Set(searchIDs)] } },
            ],
        });

        if (playerhistoryData.length) logger.debug("Bot", "History found");
        else logger.debug("Bot", "No history data was found");

        let previousNames: string[] | string = playerhistoryData
            .map((h) => h.player)
            .filter((h) => typeof h === "string");
        if (previousNames.length)
            previousNames = [...new Set(previousNames)].join(", ");
        else previousNames = "";

        return {
            ids: {
                playFabID: platforms.find(
                    (platform) => platform.platform === "PlayFab"
                )?.id,
                steamID: platforms.find(
                    (platform) => platform.platform === "Steam"
                )?.id,
            },
            previousNames,
            history: playerhistoryData,
        };
    }

    async deletePlayerHistory(platformIDs: string[], searchForAdmin?: boolean) {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs: string[] = [...platformIDs];

        return await this.Logs.deleteMany({
            $or: [
                searchForAdmin
                    ? {
                          admin: { $regex: searchIDs.join("|") },
                      }
                    : {
                          // "ids.platform": { $in: searchPlatforms },
                          "ids.id": { $in: searchIDs },
                      },
                { id: { $in: [...new Set(searchIDs)] } },
            ],
        });
    }

    async getPlayerPunishment(
        platformIDs: string[],
        punishmentIDs: ObjectId[],
        searchForAdmin?: boolean
    ): Promise<ILog[]> {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs: string[] = [...platformIDs];

        const playerPunishmentData = await this.Logs.find({
            $or: [
                searchForAdmin
                    ? {
                          _id: { $in: punishmentIDs },
                          admin: { $regex: searchIDs.join("|") },
                      }
                    : {
                          _id: { $in: punishmentIDs },
                          // "ids.platform": { $in: searchPlatforms },
                          "ids.id": { $in: searchIDs },
                      },
                {
                    _id: { $in: punishmentIDs },
                    id: { $in: [...new Set(searchIDs)] },
                },
            ],
        });

        if (playerPunishmentData) logger.debug("Bot", "Punishment found");
        else logger.debug("Bot", "No punishment data was found");

        return playerPunishmentData;
    }

    async deletePlayerPunishment(
        platformIDs: string[],

        punishmentIDs: ObjectId[],
        searchForAdmin?: boolean
    ) {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const searchIDs: string[] = [...platformIDs];

        return await this.Logs.deleteMany({
            $or: [
                searchForAdmin
                    ? {
                          _id: { $in: punishmentIDs },
                          admin: { $regex: searchIDs.join("|") },
                      }
                    : {
                          _id: { $in: punishmentIDs },
                          // "ids.platform": { $in: searchPlatforms },
                          "ids.id": { $in: searchIDs },
                      },
                {
                    _id: { $in: punishmentIDs },
                    id: { $in: [...new Set(searchIDs)] },
                },
            ],
        });
    }

    async updatePlayerHistory(data: {
        ids: { platform: platforms; id: string }[];
        id: string;
        player: string;
        server: string;
        type: string;
        date: number;
        admin: string;
        reason?: string;
        duration: BigNumber;
    }) {
        logger.info("Bot", "Going to save current data");
        if (process.env.NODE_ENV.trim() === "production")
            await this.Logs.create(data);
    }

    public close() {
        return mongoose.connection.close();
    }
}
