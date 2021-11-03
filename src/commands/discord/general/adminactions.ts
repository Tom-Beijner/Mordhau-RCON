import Chart from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { subDays } from "date-fns";
import pluralize from "pluralize";
import { CommandContext, CommandOptionType, SlashCreator } from "slash-create";
import { LookupPlayer } from "../../../services/PlayFab";
import config from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import StatsConfig from "../../../structures/StatsConfig";
import Watchdog from "../../../structures/Watchdog";

const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: 1920,
    height: 1080,
    backgroundColour: "#36393e",
    plugins: {
        requireLegacy: ["chartjs-plugin-datalabels"],
    },
});

Chart.defaults.color = "#fff";
Chart.defaults.font = {
    family: "sans-serif",
    size: 16,
};

export default class AdminActions extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Show admin actions by command in a chart",
            options: [
                {
                    name: "server",
                    description:
                        "Receive the list of activities from a specific server",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: [{ name: "all" }, ...config.get("servers")].map(
                        (server) => ({
                            name: server.name,
                            value: server.name,
                        })
                    ),
                },
                {
                    name: "command",
                    description: "Admin command to show",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "pastdays",
                    description: "The amount of playtime days to count",
                    required: false,
                    type: CommandOptionType.INTEGER,
                },
            ],
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();

        const options = {
            server: ctx.options.server as string,
            command: (ctx.options.command as string).toLowerCase(),
            pastdays: (ctx.options.pastdays as number) || 14,
        };

        if (options.pastdays < 1) {
            return ctx.send("The amount of days to count must be at least 1");
        }

        try {
            // Send a message with defer
            ctx.send("Fetching data...");

            let adminList = [];

            if (options.server !== "all") {
                const server = this.bot.servers.get(options.server);
                if (!server) {
                    return ctx.editOriginal(
                        `Server not found, existing servers are: ${[
                            ...this.bot.servers.keys(),
                        ].join(", ")}`
                    );
                }
                if (!server.rcon.connected || !server.rcon.authenticated) {
                    return ctx.editOriginal(
                        `Not ${
                            !server.rcon.connected
                                ? "connected"
                                : "authenticated"
                        } to server`
                    );
                }

                adminList = await server.rcon.getAdmins();
            } else adminList = await this.bot.rcon.getAdmins();
            let adminActions: { id: string; name: string; usages: number }[] =
                [];
            const currentDate = new Date().toISOString().slice(0, 10);
            const commands: { server: string; command: string }[] = [];

            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];

                const inStatsFile = StatsConfig.get(`admins.${adminID}`);
                if (!inStatsFile) continue;

                const adminServers = StatsConfig.get(
                    `admins.${adminID}.servers`,
                    {}
                ) as {
                    [server: string]: {
                        adminActions: {
                            [date: string]: {
                                [command: string]: number;
                            };
                        };
                    };
                };

                for (const server in adminServers) {
                    for (const date in adminServers[server].adminActions) {
                        for (const command in adminServers[server].adminActions[
                            date
                        ]) {
                            commands.push({
                                server,
                                command,
                            });
                        }
                    }
                }
            }

            if (
                !commands.length ||
                !commands.find(
                    (c) =>
                        c.command === options.command &&
                        (c.server === options.server ||
                            options.server === "all")
                )
            ) {
                return ctx.editOriginal(
                    !commands.length
                        ? "No commands has been saved"
                        : `No admins found with ${
                              options.command
                          } command usage in the last ${
                              options.pastdays
                          } days\n${`The saved commands are ${commands
                              .map((c) => c.command)
                              .sort((a, b) => (a > b ? 1 : -1))
                              .join(", ")}`}`
                );
            }

            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];

                const inStatsFile = StatsConfig.get(`admins.${adminID}`);

                if (inStatsFile) {
                    const actions = StatsConfig.get(
                        `admins.${adminID}.servers`,
                        {}
                    ) as {
                        [server: string]: {
                            adminActions: {
                                [date: string]: {
                                    [command: string]: number;
                                };
                            };
                        };
                    };

                    // Get last days and filter command by options.command and get command usage from server or get from all server if options.server is all
                    const commandUsages: { id: string; usages: number }[] = [];

                    for (const server in actions) {
                        for (const date in StatsConfig.get(
                            `admins.${adminID}.servers.${server}.adminActions`,
                            {}
                        )) {
                            if (
                                new Date(date).toISOString().slice(0, 10) >=
                                subDays(new Date(), options.pastdays)
                                    .toISOString()
                                    .slice(0, 10)
                            ) {
                                const commandUsage =
                                    options.server !== "all"
                                        ? actions[server].adminActions[date][
                                              options.command
                                          ] || 0
                                        : Object.values(
                                              StatsConfig.get(
                                                  `admins.${adminID}.servers.${server}.adminActions.${date}`,
                                                  {}
                                              ) as {
                                                  [command: string]: number;
                                              }
                                          ).reduce((a, b) => a + b, 0);

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
                        name: StatsConfig.get(`admins.${adminID}.name`),
                        usages: commandUsages
                            .filter((c) => c.id === adminID)
                            .reduce(
                                (acc, commandUsages) =>
                                    acc + commandUsages.usages,
                                0
                            ),
                    });
                } else {
                    const admin =
                        this.bot.cachedPlayers.get(adminID) ||
                        (await LookupPlayer(adminID));

                    StatsConfig.set(`admins.${adminID}`, {
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

            adminActions = adminActions.sort((a, b) => {
                if (a.name < b.name) return 1;
                if (a.name > b.name) return -1;
                return b.usages - a.usages;
            });

            const backgroundColor: string[] = [];

            for (let i = 0; i < adminActions.length; i++) {
                const backgroundColors = [
                    "#ffc312",
                    "#12cbc4",
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

                backgroundColor.push(
                    backgroundColors[
                        Math.floor(Math.random() * backgroundColors.length)
                    ]
                );
            }

            const image = await chartJSNodeCanvas.renderToBuffer(
                {
                    type: "bar",
                    data: {
                        labels: adminActions.map((admin) => admin.name),
                        datasets: [
                            {
                                label: `Command usage (${options.command.toLowerCase()})`,
                                data: adminActions.map(
                                    (admin) => admin.usages || 0
                                ),
                                backgroundColor: backgroundColor,
                            },
                        ],
                    },
                    options: {
                        indexAxis: "y",
                        // maintainAspectRatio: false,
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
                                text: `Chart of ${options.command.toLowerCase()} usage usage on ${
                                    options.server
                                } server${
                                    options.server === "all" ? "s" : ""
                                } (past ${pluralize(
                                    "day",
                                    options.pastdays,
                                    true
                                )})`,
                            },
                            datalabels: {
                                // anchor: "end",
                                // align: "end",
                                // clip: true,
                                clamp: true,
                            },
                        } as any,
                        // Performance improvements
                        animation: {
                            duration: 0, // general animation time
                        },
                        // hover: {
                        //     animationDuration: 0, // duration of animations when hovering an item
                        // },
                        // responsiveAnimationDuration: 0, // animation duration after a resize
                        elements: {
                            line: {
                                tension: 0, // disables bezier curves
                            },
                        },
                        animations: {
                            enabled: false, // turns off all animations
                        },
                    },
                },
                "image/png"
            );

            return ctx.editOriginal({
                content: "",
                embeds: [
                    {
                        title: `Chart of ${options.command.toLowerCase()} usage on ${
                            options.server
                        } server${
                            options.server === "all" ? "s" : ""
                        } (past ${pluralize("day", options.pastdays, true)})`,
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
        } catch (error) {
            await ctx.editOriginal({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
