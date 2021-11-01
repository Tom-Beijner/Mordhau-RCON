import appRootPath from "app-root-path";
import { exec } from "child_process";
import download from "download-git-repo";
import fs from "fs-extra";
import fetch from "node-fetch";
import path from "path";
import pm2 from "pm2";
import removeMarkdown from "remove-markdown";
import { promisify } from "util";
import logger from "../utils/logger";

const pm2ListPromise = promisify(pm2.list);
const pm2DescribePromise = promisify(pm2.describe);
const pm2RestartPromise = promisify(pm2.restart);
const downloadPromise = promisify(download);
const execPromise = promisify(exec);

interface Config {
    repository: string;
    branch: string;
    ignoredFiles: string[];
    downloadSubdirectory: string;
    backupSubdirectory: string;
    autoUpdateInterval: number;
}

export default class AutoUpdater {
    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    async check(): Promise<{ success: boolean; error: any }> {
        const versionCheck = await this.compareVersions();

        if (versionCheck.upToDate) return { success: false, error: null };

        return await this.forceUpdate();
    }

    async autoUpdate() {
        await this.check();

        setInterval(
            this.check.bind(this),
            this.config.autoUpdateInterval * 60 * 1000
        );
    }

    async compareVersions() {
        try {
            logger.debug("Auto Updater", "Checking for updates...");
            const currentVersion = await this.readLocalVersion();
            const remoteVersion = await this.readRemoteVersion();
            const upToDate = currentVersion == remoteVersion;

            if (upToDate) {
                logger.debug("Auto Updater", `Up to date! (${currentVersion})`);
            } else {
                logger.info(
                    "Auto Updater",
                    `New update available: ${remoteVersion} (Current: ${currentVersion})`
                );
            }

            return { upToDate, currentVersion, remoteVersion };
        } catch (error) {
            logger.error(
                "Auto Updater",
                `Error occurred while comparing local and remote versions (${
                    error.message || error
                })`
            );

            return {
                upToDate: false,
            };
        }
    }

    async forceUpdate(): Promise<{ success: boolean; error: any }> {
        try {
            logger.info("Auto Updater", "Updating the bot...");

            // Download repo
            let destination = path.join(
                appRootPath.path,
                ".autoUpdater",
                this.config.downloadSubdirectory
            );
            logger.debug(
                "Auto Updater",
                `Downloading the repo to ${destination}`
            );
            await fs.ensureDir(destination);
            await fs.emptyDir(destination);
            await downloadPromise(this.config.repository, destination);

            // Delete ignored files
            if (this.config.ignoredFiles.length) {
                logger.debug(
                    "Auto Updater",
                    `Removing ignored files from update (Files: ${this.config.ignoredFiles.join(
                        ","
                    )})`
                );
                this.config.ignoredFiles.forEach((file) => {
                    file = path.join(
                        appRootPath.path,
                        ".autoUpdater",
                        this.config.downloadSubdirectory,
                        file
                    );
                    fs.unlinkSync(file);
                });
            }

            // Copy downloaded files to main folder
            const source = path.join(
                appRootPath.path,
                ".autoUpdater",
                this.config.downloadSubdirectory
            );
            (destination =
                process.env.NODE_ENV.trim() !== "production"
                    ? path.join(appRootPath.path, ".autoUpdater", "development")
                    : appRootPath.path),
                ".autoUpdater";
            logger.info("Auto Updater", "Installing update...");
            logger.debug("Auto Updater", `Source: ${source}`);
            logger.debug("Auto Updater", `Destination: ${destination}`);
            await fs.ensureDir(destination);
            await fs.copy(source, destination);

            // Install dependencies
            await new Promise(function (resolve, reject) {
                (destination =
                    process.env.NODE_ENV.trim() !== "production"
                        ? path.join(
                              appRootPath.path,
                              ".autoUpdater",
                              "development"
                          )
                        : appRootPath.path),
                    ".autoUpdater";
                logger.debug(
                    "Auto Updater",
                    "Installing application dependencies in " + destination
                );
                const child = exec(`cd ${destination} && npm install`);

                child.stdout.on("end", resolve);
                child.stdout.on("data", (data) =>
                    logger.info(
                        "Auto Updater",
                        `npm install: ${data.replace(/\r?\n\r?\n/g, "")}`
                    )
                );
                child.stderr.on("data", (data) => {
                    if (data.toLowerCase().includes("error")) {
                        // npm passes warnings as errors, only reject if "error" is included
                        logger.error(
                            "Auto Updater",
                            `Error occurred while installing dependencies (${data.replace(
                                /\r?\n\r?\n/g,
                                ""
                            )})`
                        );
                        reject();
                    } else {
                        logger.warn(
                            "Auto Updater",
                            data.replace(/\r?\n\r?\n/g, "")
                        );
                    }
                });
            });

            const { stderr } = await execPromise("npm run build");
            if (stderr) {
                logger.error(
                    "Auto Updater",
                    `Error occurred while building (${stderr})`
                );

                throw new Error(stderr);
            }

            const changelog = removeMarkdown(
                (
                    await fs.readFile(`${appRootPath}/CHANGELOG.md`, "utf8")
                ).replace("\n", ""),
                { stripListLeaders: false }
            ).split("\n") as string[];
            const firstOccurance = changelog.findIndex((string) =>
                string.includes("[")
            );

            logger.info("Auto Updater", "Finished installing update");
            logger.info(
                "Auto Updater",
                `Latest Update:\n${changelog
                    .splice(
                        4,
                        firstOccurance === -1
                            ? changelog.length
                            : firstOccurance
                    )
                    .join("\n")}`
            );
            logger.info(
                "Auto Updater",
                "Carefully read through the changelog and make any necessary changes"
            );

            try {
                await new Promise<void>((resolve, reject) => {
                    pm2.list((err, list) => {
                        if (err) return reject(err);

                        const pm2ID = list.find(
                            (project) =>
                                project.pid && project.pid === process.pid
                        )?.pm_id;

                        if (typeof pm2ID === "undefined") {
                            return reject(
                                new Error(
                                    "Process not running as a PM2 instance"
                                )
                            );
                        }

                        pm2.restart(pm2ID, (err) => {
                            if (err) return reject(err);
                            pm2.disconnect();

                            return resolve();
                        });
                    });
                });
            } catch (err) {
                if (!(err instanceof Error)) {
                    throw err;
                } else if (
                    err.message === "Process not running as a PM2 instance"
                ) {
                    setInterval(() => {
                        logger.warn(
                            "Auto Updater",
                            `Bot was updated to ${this.readLocalVersion()}, restart the bot`
                        );
                    }, 300000);
                }
            }

            return { success: true, error: null };
        } catch (error) {
            logger.error(
                "Auto Updater",
                `Error occurred while updating the bot (${
                    error.message || error
                })`
            );

            return { success: false, error };
        }
    }

    async readLocalVersion() {
        logger.debug("Auto Updater", "Reading current version");

        const file = path.join(appRootPath.path, "package.json");
        const localPackage = (await fs.readFile(file)).toString();

        return `v${JSON.parse(localPackage).version as string}`;
    }

    async readRemoteVersion() {
        logger.debug("Auto Updater", "Reading remote version");

        try {
            const remotePackage = await (
                await fetch(
                    `https://raw.githubusercontent.com/${this.config.repository}/${this.config.branch}/package.json`,
                    {
                        headers: { "Content-Type": "application/json" },
                    }
                )
            ).json();

            return `v${remotePackage.version as string}`;
        } catch (error) {
            logger.error(
                "Auto Updater",
                `Error occurred while reading remote version (${
                    error.message || error
                })`
            );

            throw error;
        }
    }
}
