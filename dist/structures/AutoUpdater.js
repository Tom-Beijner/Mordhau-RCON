"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_root_path_1 = __importDefault(require("app-root-path"));
const child_process_1 = require("child_process");
const download_git_repo_1 = __importDefault(require("download-git-repo"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const pm2_1 = __importDefault(require("pm2"));
const util_1 = require("util");
const logger_1 = __importDefault(require("../utils/logger"));
const pm2ListPromise = util_1.promisify(pm2_1.default.list);
const pm2DescribePromise = util_1.promisify(pm2_1.default.describe);
const pm2RestartPromise = util_1.promisify(pm2_1.default.restart);
const downloadPromise = util_1.promisify(download_git_repo_1.default);
const execPromise = util_1.promisify(child_process_1.exec);
class AutoUpdater {
    constructor(config) {
        this.config = config;
    }
    async check() {
        const versionCheck = await this.compareVersions();
        if (versionCheck.upToDate)
            return { success: false, error: null };
        return await this.forceUpdate();
    }
    async autoUpdate() {
        await this.check();
        setInterval(this.check.bind(this), this.config.autoUpdateInterval * 60 * 1000);
    }
    async compareVersions() {
        try {
            logger_1.default.debug("Auto Updater", "Checking for updates...");
            const currentVersion = await this.readLocalVersion();
            const remoteVersion = await this.readRemoteVersion();
            const upToDate = currentVersion == remoteVersion;
            if (upToDate) {
                logger_1.default.debug("Auto Updater", `Up to date! (${currentVersion})`);
            }
            else {
                logger_1.default.info("Auto Updater", `New update available: ${remoteVersion} (Current: ${currentVersion})`);
            }
            return { upToDate, currentVersion, remoteVersion };
        }
        catch (error) {
            logger_1.default.error("Auto Updater", `Error occurred while comparing local and remote versions (${error.message || error})`);
            return {
                upToDate: false,
            };
        }
    }
    async forceUpdate() {
        try {
            logger_1.default.info("Auto Updater", "Updating the bot...");
            let destination = path_1.default.join(app_root_path_1.default.path, ".autoUpdater", this.config.downloadSubdirectory);
            logger_1.default.debug("Auto Updater", `Downloading the repo to ${destination}`);
            await fs_extra_1.default.ensureDir(destination);
            await fs_extra_1.default.emptyDir(destination);
            await downloadPromise(this.config.repository, destination);
            if (this.config.ignoredFiles.length) {
                logger_1.default.debug("Auto Updater", `Removing ignored files from update (Files: ${this.config.ignoredFiles.join(",")})`);
                this.config.ignoredFiles.forEach((file) => {
                    file = path_1.default.join(app_root_path_1.default.path, ".autoUpdater", this.config.downloadSubdirectory, file);
                    fs_extra_1.default.unlinkSync(file);
                });
            }
            const source = path_1.default.join(app_root_path_1.default.path, ".autoUpdater", this.config.downloadSubdirectory);
            destination =
                process.env.NODE_ENV.trim() !== "production"
                    ? path_1.default.join(app_root_path_1.default.path, ".autoUpdater", "development")
                    : path_1.default.join(app_root_path_1.default.path);
            logger_1.default.info("Auto Updater", "Installing update...");
            logger_1.default.debug("Auto Updater", `Source: ${source}`);
            logger_1.default.debug("Auto Updater", `Destination: ${destination}`);
            await fs_extra_1.default.ensureDir(destination);
            await fs_extra_1.default.copy(source, destination);
            await new Promise(function (resolve, reject) {
                logger_1.default.debug("Auto Updater", "Installing application dependencies in " + destination);
                const child = child_process_1.exec(`npm install --prefix ${destination}`);
                child.stdout.on("end", resolve);
                child.stdout.on("data", (data) => logger_1.default.info("Auto Updater", `npm install: ${data.replace(/\r?\n\r?\n/g, "")}`));
                child.stderr.on("data", (data) => {
                    if (data.toLowerCase().includes("error")) {
                        logger_1.default.error("Auto Updater", `Error occurred while installing dependencies (${data.replace(/\r?\n\r?\n/g, "")})`);
                        reject();
                    }
                    else {
                        logger_1.default.warn("Auto Updater", data.replace(/\r?\n\r?\n/g, ""));
                    }
                });
            });
            const changelog = await fs_extra_1.default.readFile(path_1.default.join(app_root_path_1.default.path, ".autoUpdater", this.config.downloadSubdirectory, "CHANGELOG.md"), "utf8");
            const latestVersion = changelog
                .split("\n")
                .find((line) => line.startsWith("## "))
                .replace("## ", "");
            logger_1.default.info("Auto Updater", "Finished installing update");
            logger_1.default.info("Auto Updater", `Latest Update:\n${latestVersion}`);
            logger_1.default.info("Auto Updater", "Carefully read through the changelog and make any necessary changes");
            try {
                await new Promise((resolve, reject) => {
                    pm2_1.default.list((err, list) => {
                        var _a;
                        if (err)
                            return reject(err);
                        const pm2ID = (_a = list.find((project) => project.pid && project.pid === process.pid)) === null || _a === void 0 ? void 0 : _a.pm_id;
                        if (typeof pm2ID === "undefined") {
                            return reject(new Error("Process not running as a PM2 instance"));
                        }
                        pm2_1.default.restart(pm2ID, (err) => {
                            if (err)
                                return reject(err);
                            pm2_1.default.disconnect();
                            return resolve();
                        });
                    });
                });
            }
            catch (err) {
                if (!(err instanceof Error)) {
                    throw err;
                }
                else if (err.message === "Process not running as a PM2 instance") {
                    setInterval(() => {
                        logger_1.default.warn("Auto Updater", `Bot was updated to ${this.readLocalVersion()}, restart the bot`);
                    }, 300000);
                }
            }
            return { success: true, error: null };
        }
        catch (error) {
            logger_1.default.error("Auto Updater", `Error occurred while updating the bot (${error.message || error})`);
            return { success: false, error };
        }
    }
    async readLocalVersion() {
        logger_1.default.debug("Auto Updater", "Reading current version");
        const file = path_1.default.join(app_root_path_1.default.path, "package.json");
        const localPackage = (await fs_extra_1.default.readFile(file)).toString();
        return `v${JSON.parse(localPackage).version}`;
    }
    async readRemoteVersion() {
        logger_1.default.debug("Auto Updater", "Reading remote version");
        try {
            const remotePackage = await (await node_fetch_1.default(`https://raw.githubusercontent.com/${this.config.repository}/${this.config.branch}/package.json`, {
                headers: { "Content-Type": "application/json" },
            })).json();
            return `v${remotePackage.version}`;
        }
        catch (error) {
            logger_1.default.error("Auto Updater", `Error occurred while reading remote version (${error.message || error})`);
            throw error;
        }
    }
}
exports.default = AutoUpdater;
