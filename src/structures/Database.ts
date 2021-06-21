import flatMap from "array.prototype.flatmap";
import mongoose from "mongoose";
import logSchema, { ILog, platforms } from "../models/logSchema";
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
        });

        return this;
    }

    public get Logs() {
        return logSchema;
    }

    async getPlayerHistory(platformIDs: string[]): Promise<{
        ids: {
            playFabID?: string;
            steamID?: string;
        };
        previousNames: string;
        history: ILog[];
    }> {
        platformIDs = platformIDs.filter((p) => typeof p === "string");
        const platforms = platformIDs.map((id) => parsePlayerID(id));
        const playFabHistory = await this.Logs.find({
            $or: [
                {
                    // "ids.platform": {
                    //     $in: platforms.map((platform) => platform.platform),
                    // },
                    "ids.id": { $in: platforms.map((platform) => platform.id) },
                },
                { id: { $in: platformIDs } },
            ],
        }).sort("-_id");
        const ids: { platform: platforms; id: string }[] = [
            ...new Set(
                flatMap(
                    playFabHistory,
                    (record) => record.ids || [parsePlayerID(record.id)]
                ).filter((record) => record.id)
            ),
        ];
        const playFab = ids.find((p) => p.platform === "PlayFab");
        const steam = ids.find((p) => p.platform === "Steam");
        // const searchPlatforms: platforms[] = [];
        const searchIDs: string[] = [...platformIDs];

        if (playFab) {
            // searchPlatforms.push(playFab.platform);
            searchIDs.push(playFab.id);
        }
        if (steam) {
            // searchPlatforms.push(steam.platform);
            searchIDs.push(steam.id);
        }

        const playerhistoryData = await this.Logs.find({
            $or: [
                {
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
                playFabID:
                    (playFab && playFab.id) ||
                    platformIDs.find(
                        (id) => parsePlayerID(id).platform === "PlayFab"
                    ),
                steamID:
                    (steam && steam.id) ||
                    platformIDs.find(
                        (id) => parsePlayerID(id).platform === "Steam"
                    ),
            },
            previousNames,
            history: playerhistoryData,
        };
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
        duration: number;
    }) {
        logger.info("Bot", "Going to save current data");
        if (process.env.NODE_ENV.trim() === "production")
            await this.Logs.create(data);
    }

    public close() {
        return mongoose.connection.close();
    }
}
