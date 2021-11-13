"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chart_js_1 = __importDefault(require("chart.js"));
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const date_fns_1 = require("date-fns");
const mongodb_1 = require("mongodb");
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const StatsConfig_1 = __importDefault(require("../../../structures/StatsConfig"));
const chartJSNodeCanvas = new chartjs_node_canvas_1.ChartJSNodeCanvas({
    width: 1920,
    height: 1080,
    backgroundColour: "#36393e",
    plugins: {
        requireLegacy: ["chartjs-plugin-datalabels"],
    },
});
chart_js_1.default.defaults.color = "#fff";
chart_js_1.default.defaults.font = {
    family: "sans-serif",
    size: 16,
};
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
                var server = this.bot.servers.get(options.server);
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
            const commands = [
                { server: null, command: "punishments" },
            ];
            const punishments = (await this.bot.database.Logs.distinct("type", {
                _id: {
                    $gte: new mongodb_1.ObjectId(Math.floor(date_fns_1.subDays(new Date(), options.pastdays).getTime() / 1000)),
                },
                ...(options.server !== "all" && { server: options.server }),
            })).map((type) => pluralize_1.default(type.toLowerCase()));
            if (punishments.length)
                punishments.push("punishments");
            for (let i = 0; i < punishments.length; i++) {
                const punishment = punishments[i];
                commands.push({
                    server: options.server,
                    command: punishment,
                });
            }
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inStatsFile = StatsConfig_1.default.get(`admins.${adminID}`);
                if (!inStatsFile)
                    continue;
                const adminServers = StatsConfig_1.default.get(`admins.${adminID}.servers`, {});
                if (options.server === "all") {
                    for (const server in adminServers) {
                        for (const date in StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions`, {})) {
                            for (const command in StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions.${date}`, {})) {
                                if (commands.find((c) => c.command === command &&
                                    c.server === server))
                                    continue;
                                commands.push({
                                    server,
                                    command,
                                });
                            }
                        }
                    }
                }
                else {
                    for (const date in StatsConfig_1.default.get(`admins.${adminID}.servers.${server.name}.adminActions`, {})) {
                        for (const command in StatsConfig_1.default.get(`admins.${adminID}.servers.${server.name}.adminActions.${date}`, {})) {
                            if (commands.find((c) => c.command === command &&
                                c.server === options.server))
                                continue;
                            commands.push({
                                server: options.server,
                                command,
                            });
                        }
                    }
                }
            }
            if (!commands.filter((c) => options.server === "all" || c.server === options.server).length ||
                !commands.find((c) => c.command === options.command &&
                    (options.server === "all" ||
                        c.server === options.server))) {
                return ctx.editOriginal(!commands.filter((c) => options.server === "all" ||
                    c.server === options.server).length
                    ? "No commands has been saved"
                    : `No admins found with ${options.command} command usage for ${options.server === "all"
                        ? "`all` servers"
                        : `\`${options.server}\` server`} in the last ${options.pastdays} days\n${`The saved commands are ${[
                        ...new Set(commands
                            .filter((c) => options.server === "all" ||
                            c.server === options.server)
                            .map((c) => c.command)),
                    ]
                        .sort((a, b) => (a > b ? 1 : -1))
                        .join(", ")}`}`);
            }
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inStatsFile = StatsConfig_1.default.get(`admins.${adminID}`);
                if (inStatsFile) {
                    if (["punishments", ...punishments].includes(options.command)) {
                        adminActions.push({
                            id: adminID,
                            name: StatsConfig_1.default.get(`admins.${adminID}.name`),
                            usages: (await this.bot.database.getPlayerHistory([adminID], true, {
                                _id: {
                                    $gte: new mongodb_1.ObjectId(Math.floor(date_fns_1.subDays(new Date(), options.pastdays).getTime() / 1000)),
                                },
                                ...("punishments" !==
                                    options.command && {
                                    type: new RegExp(pluralize_1.default(options.command, 1), "i"),
                                }),
                            })).history.length,
                        });
                    }
                    else {
                        const actions = StatsConfig_1.default.get(`admins.${adminID}.servers`, {});
                        const commandUsages = [];
                        for (const server in actions) {
                            for (const date in StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions`, {})) {
                                if (new Date(date).toISOString().slice(0, 10) >=
                                    date_fns_1.subDays(new Date(), options.pastdays)
                                        .toISOString()
                                        .slice(0, 10)) {
                                    const commandUsage = StatsConfig_1.default.get(`admins.${adminID}.servers.${server}.adminActions.${date}.${options.command}`, 0);
                                    if (commandUsage) {
                                        commandUsages.push({
                                            id: adminID,
                                            usages: commandUsage,
                                        });
                                    }
                                }
                            }
                        }
                        adminActions.push({
                            id: adminID,
                            name: StatsConfig_1.default.get(`admins.${adminID}.name`),
                            usages: commandUsages
                                .filter((c) => c.id === adminID)
                                .reduce((acc, commandUsages) => acc + commandUsages.usages, 0),
                        });
                    }
                }
                else {
                    const admin = this.bot.cachedPlayers.get(adminID) ||
                        (await PlayFab_1.LookupPlayer(adminID));
                    StatsConfig_1.default.set(`admins.${adminID}`, {
                        name: admin.name,
                    });
                    adminActions.push({
                        id: adminID,
                        name: admin.name,
                        usages: 0,
                    });
                }
            }
            await ctx.editOriginal("Generating chart...");
            adminActions = adminActions
                .sort((a, b) => (a.usages > b.usages ? -1 : 1))
                .sort((a, b) => a.name.localeCompare(b.name, "en"));
            const backgroundColor = [];
            for (let i = 0; i < adminActions.length; i++) {
                const backgroundColors = [
                    "#ed4c67",
                    "#f79f1f",
                    "#a3cb38",
                    "#1289a7",
                    "#d980fa",
                    "#b53471",
                    "#ee5a24",
                    "#009432",
                    "#0652dd",
                    "#9980fa",
                    "#833471",
                    "#ea2027",
                    "#006266",
                    "#1b1464",
                    "#5758bb",
                    "#6f1e51",
                ];
                backgroundColor.push(backgroundColors[Math.floor(Math.random() * backgroundColors.length)]);
            }
            const title = `Chart of ${pluralize_1.default(options.command.toLowerCase(), 1)} usage on ${options.server} server${options.server === "all" ? "s" : ""} (past ${pluralize_1.default("day", options.pastdays, true)}${options.command === "punishments"
                ? `, types: ${punishments
                    .filter((p) => p !== "punishments")
                    .sort()
                    .join(", ")}`
                : ""})`;
            const image = await chartJSNodeCanvas.renderToBuffer({
                type: "bar",
                data: {
                    labels: adminActions.map((admin) => admin.name),
                    datasets: [
                        {
                            label: `Command usage (${options.command.toLowerCase()})`,
                            data: adminActions.map((admin) => admin.usages || 0),
                            backgroundColor: backgroundColor,
                        },
                    ],
                },
                options: {
                    indexAxis: "y",
                    scales: {
                        xAxes: {
                            ticks: {
                                precision: 0,
                            },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: title,
                        },
                        datalabels: {
                            anchor: "start",
                            align: "end",
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
            const imageURI = `adminActions_${options.server}_${options.command.toLowerCase()}_${currentDate}_(${pluralize_1.default("day", options.pastdays, true)}).png`.replace(/ |\(|\)/g, "_");
            return ctx.editOriginal({
                content: "",
                embeds: [
                    {
                        title: title,
                        image: {
                            url: `attachment://${imageURI}`,
                        },
                    },
                ],
                file: {
                    file: image,
                    name: imageURI,
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
