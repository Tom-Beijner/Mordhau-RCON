"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chart_js_1 = __importDefault(require("chart.js"));
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const date_fns_1 = require("date-fns");
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const StatsConfig_1 = __importDefault(require("../../../structures/StatsConfig"));
const chartJSNodeCanvas = new chartjs_node_canvas_1.ChartJSNodeCanvas({
    width: 1500,
    height: 844,
    backgroundColour: "#36393e",
});
chart_js_1.default.defaults.color = "#fff";
class AdminActions extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Show admin actions by command in a chart",
            options: [
                {
                    name: "server",
                    description: "Receive the list of activities from a specific server",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                    choices: [{ name: "all" }, ...Config_1.default.get("servers")].map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "command",
                    description: "Admin command to show",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
                {
                    name: "pastdays",
                    description: "The amount of playtime days to count",
                    required: false,
                    type: slash_create_1.CommandOptionType.INTEGER,
                },
            ],
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            server: ctx.options.server,
            command: ctx.options.command.toLowerCase(),
            pastdays: ctx.options.pastdays || 14,
        };
        if (options.pastdays < 1) {
            return ctx.send("The amount of days to count must be at least 1");
        }
        try {
            ctx.send("Fetching data...");
            let adminList = [];
            if (options.server !== "all") {
                const server = this.bot.servers.get(options.server);
                if (!server) {
                    return ctx.editOriginal(`Server not found, existing servers are: ${[
                        ...this.bot.servers.keys(),
                    ].join(", ")}`);
                }
                if (!server.rcon.connected || !server.rcon.authenticated) {
                    return ctx.editOriginal(`Not ${!server.rcon.connected
                        ? "connected"
                        : "authenticated"} to server`);
                }
                adminList = await server.rcon.getAdmins();
            }
            else
                adminList = await this.bot.rcon.getAdmins();
            let adminActions = [];
            const currentDate = new Date().toISOString().slice(0, 10);
            const commands = [];
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inStatsFile = StatsConfig_1.default.get(`admins.${adminID}`);
                if (!inStatsFile)
                    continue;
                const adminServers = StatsConfig_1.default.get(`admins.${adminID}.servers`, {});
                for (const server in adminServers) {
                    for (const command in adminServers[server]) {
                        if (!commands.find((c) => c.server === server && c.command === command)) {
                            commands.push({
                                server,
                                command,
                            });
                        }
                    }
                }
            }
            if (!commands.find((c) => c.command === options.command &&
                c.server === options.server) &&
                options.server !== "all") {
                return ctx.editOriginal(`No admins found with ${options.command} command usage in the last ${options.pastdays} days\nThe saved commands are ${commands.join(", ")}`);
            }
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inStatsFile = StatsConfig_1.default.get(`admins.${adminID}`);
                if (inStatsFile) {
                    const actions = StatsConfig_1.default.get(`admins.${adminID}.servers`, {});
                    const commandUsages = [];
                    for (const server in actions) {
                        for (const date in StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions`, {})) {
                            console.log("date", date);
                            if (new Date(date).toISOString().slice(0, 10) >=
                                date_fns_1.subDays(new Date(), options.pastdays)
                                    .toISOString()
                                    .slice(0, 10)) {
                                const commandUsage = options.server !== "all"
                                    ? actions[server].adminActions[date][options.command] || 0
                                    : Object.values(StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions.${date}`, {})).reduce((a, b) => a + (b[options.command] || 0), 0);
                                console.log(server, commandUsage);
                                if (commandUsage) {
                                    commandUsages.push({
                                        id: adminID,
                                        usages: commandUsage,
                                    });
                                }
                            }
                        }
                    }
                    const admin = this.bot.cachedPlayers.get(adminID) ||
                        (await PlayFab_1.LookupPlayer(adminID));
                    console.log(commandUsages);
                    adminActions.push({
                        id: adminID,
                        name: admin.name,
                        usages: commandUsages
                            .filter((c) => c.id === adminID)
                            .reduce((acc, commandUsages) => acc + commandUsages.usages, 0),
                    });
                }
                else {
                    const admin = this.bot.cachedPlayers.get(adminID) ||
                        (await PlayFab_1.LookupPlayer(adminID));
                    StatsConfig_1.default.set(`admins.${adminID}`, {
                        name: admin.name,
                    });
                }
            }
            await ctx.editOriginal("Generating chart...");
            adminActions = adminActions.sort((a, b) => {
                if (a.name < b.name)
                    return 1;
                if (a.name > b.name)
                    return -1;
                return b.usages - a.usages;
            });
            const image = await chartJSNodeCanvas.renderToBuffer({
                type: "bar",
                data: {
                    labels: adminActions.map((admin) => admin.name),
                    datasets: [
                        {
                            label: `Command usage (${options.command.toLowerCase()})`,
                            data: adminActions.map((admin) => admin.usages || 0),
                            backgroundColor: [
                                `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                            ],
                        },
                    ],
                },
                options: {
                    indexAxis: "y",
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: `Chart of ${options.command.toLowerCase()} usage usage on ${options.server} server${options.server === "all" ? "s" : ""} (past ${pluralize_1.default("day", options.pastdays, true)})`,
                        },
                    },
                    animation: {
                        duration: 0,
                    },
                    elements: {
                        line: {
                            tension: 0,
                        },
                    },
                    animations: {
                        enabled: false,
                    },
                },
            }, "image/png");
            return ctx.editOriginal({
                content: "",
                embeds: [
                    {
                        title: `Chart of ${options.command.toLowerCase()} usage on ${options.server} server${options.server === "all" ? "s" : ""} (past ${pluralize_1.default("day", options.pastdays, true)})`,
                        image: {
                            url: `attachment://adminActions_${options.server}_${options.command}_${currentDate}.png`,
                        },
                    },
                ],
                file: {
                    file: image,
                    name: `adminActions_${options.server}_${options.command}_${currentDate}.png`,
                },
            });
        }
        catch (error) {
            await ctx.editOriginal({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = AdminActions;
