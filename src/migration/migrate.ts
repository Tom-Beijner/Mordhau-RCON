import Conf from "conf";
import fs from "fs/promises";
import path from "path";
import config from "../structures/Config";
import Database from "../structures/Database";
import { parsePlayerID } from "../utils/PlayerID";

interface History {
    BanDate: string;
    BanDuration: number;
    BanAdmin?: string;
    MuteAdmin?: string;
    BanReason: string;
    Type: string;
}

interface Files {
    name: string;
    directory: string;
}

async function getAllFiles(dirPath: string, arrayOfFiles?: Files[]) {
    const files = await fs.readdir(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const directory = `${dirPath}/${file}`;

        if ((await fs.stat(directory)).isDirectory()) {
            arrayOfFiles = await getAllFiles(directory, arrayOfFiles);
        } else {
            arrayOfFiles.push({
                // The file extension (.json) is 5 characters long and should be removed to receive the file name
                name: file.slice(0, -5).replace(/_/g, " "),
                directory: path.join(directory),
            });
        }
    }

    return arrayOfFiles;
}

(async function main() {
    const database = new Database({
        host: config.get("database.host"),
        database: config.get("database.database"),
        username: config.get("database.username"),
        password: config.get("database.password"),
    });

    await database.connect();

    const migrationConfig = new Conf({
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
        const directoryExists = await fs.stat(path.join(__dirname, "save"));

        if (!directoryExists.isDirectory()) {
            console.error("Seems like save is a file and not a directory");
        }
    } catch (error) {
        console.error("Save directory missing");
        process.exit(1);
    }

    const files = await getAllFiles(path.join(__dirname, "save"));

    console.log(`Fetched ${files.length} punishment files`);

    for (let i = 0; i < files.length; i++) {
        console.log(`Processing file ${i + 1}/${files.length}`);

        const file = files[i];
        const server = file.name;
        const punishments = JSON.parse(
            await fs.readFile(file.directory, "utf8")
        );

        for (const player in punishments) {
            if (
                (migrationConfig.get("exclude.players") as string[]).includes(
                    player
                )
            )
                continue;

            const { history }: { history: History[] } = punishments[player];

            for (let i = 0; i < history.length; i++) {
                const punishment: History = history[i];

                const admin = punishment.BanAdmin || punishment.MuteAdmin;

                const regex = new RegExp(/.+((?<=\()(.*?)(?=\s*\)).+)$/g);
                const regexParsed = regex.exec(admin);

                if (
                    (
                        migrationConfig.get("exclude.admins") as string[]
                    ).includes(regexParsed[2])
                )
                    continue;

                const duplicate = await database.Logs.findOne({
                    ids: [parsePlayerID(player)],
                    id: player,
                    server,
                    type: punishment.Type,
                    date: new Date(punishment.BanDate).getTime(),
                    admin,
                    reason:
                        punishment.Type !== "MUTE"
                            ? punishment.BanReason
                            : null,
                    duration: punishment.BanDuration,
                });
                if (duplicate) continue;

                database.Logs.create({
                    ids: [parsePlayerID(player)],
                    id: player,
                    server,
                    type: punishment.Type,
                    date: new Date(punishment.BanDate).getTime(),
                    admin,
                    reason:
                        punishment.Type !== "MUTE"
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
