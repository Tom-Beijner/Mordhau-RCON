"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conf_1 = __importDefault(require("conf"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const Config_1 = __importDefault(require("../structures/Config"));
const Database_1 = __importDefault(require("../structures/Database"));
const PlayerID_1 = require("../utils/PlayerID");
async function getAllFiles(dirPath, arrayOfFiles) {
    const files = await promises_1.default.readdir(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const directory = `${dirPath}/${file}`;
        if ((await promises_1.default.stat(directory)).isDirectory()) {
            arrayOfFiles = await getAllFiles(directory, arrayOfFiles);
        }
        else {
            arrayOfFiles.push({
                name: file.slice(0, -5).replace(/_/g, " "),
                directory: path_1.default.join(directory),
            });
        }
    }
    return arrayOfFiles;
}
(async function main() {
    const database = new Database_1.default({
        host: Config_1.default.get("database.host"),
        database: Config_1.default.get("database.database"),
        username: Config_1.default.get("database.username"),
        password: Config_1.default.get("database.password"),
    });
    await database.connect();
    const migrationConfig = new conf_1.default({
        configName: "migration",
        cwd: "./",
        accessPropertiesByDotNotation: true,
        schema: {
            exclude: {
                type: "object",
                properties: {
                    admins: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        exclusiveMinimum: 0,
                    },
                    players: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        exclusiveMinimum: 0,
                    },
                },
            },
        },
        defaults: {
            exclude: {
                admins: [],
                players: [],
            },
        },
    });
    try {
        const directoryExists = await promises_1.default.stat(path_1.default.join(__dirname, "save"));
        if (!directoryExists.isDirectory()) {
            console.error("Seems like save is a file and not a directory");
        }
    }
    catch (error) {
        console.error("Save directory missing");
        process.exit(1);
    }
    const files = await getAllFiles(path_1.default.join(__dirname, "save"));
    console.log(`Fetched ${files.length} punishment files`);
    for (let i = 0; i < files.length; i++) {
        console.log(`Processing file ${i + 1}/${files.length}`);
        const file = files[i];
        const server = file.name;
        const punishments = JSON.parse(await promises_1.default.readFile(file.directory, "utf8"));
        for (const player in punishments) {
            if (migrationConfig.get("exclude.players").includes(player))
                continue;
            const { history } = punishments[player];
            for (let i = 0; i < history.length; i++) {
                const punishment = history[i];
                const admin = punishment.BanAdmin || punishment.MuteAdmin;
                const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                const regexParsed = regex.exec(admin);
                if (migrationConfig.get("exclude.admins").includes(regexParsed[2]))
                    continue;
                const duplicate = await database.Logs.findOne({
                    ids: [PlayerID_1.parsePlayerID(player)],
                    id: player,
                    server,
                    type: punishment.Type,
                    date: new Date(punishment.BanDate).getTime(),
                    admin,
                    reason: punishment.Type !== "MUTE"
                        ? punishment.BanReason
                        : null,
                    duration: punishment.BanDuration,
                });
                if (duplicate)
                    continue;
                database.Logs.create({
                    ids: [PlayerID_1.parsePlayerID(player)],
                    id: player,
                    server,
                    type: punishment.Type,
                    date: new Date(punishment.BanDate).getTime(),
                    admin,
                    reason: punishment.Type !== "MUTE"
                        ? punishment.BanReason
                        : null,
                    duration: punishment.BanDuration,
                });
            }
        }
    }
    console.log(`Done: Migrated punishments`);
    process.exit(0);
})();
