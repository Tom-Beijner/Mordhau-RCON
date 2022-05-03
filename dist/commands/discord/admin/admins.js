"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const pluralize_1 = __importDefault(require("pluralize"));
const remove_markdown_1 = __importDefault(require("remove-markdown"));
const slash_create_1 = require("slash-create");
const table_1 = require("table");
const AdminActivityConfig_1 = __importDefault(require("../../../structures/AdminActivityConfig"));
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const utils_1 = require("../../../utils");
class Admins extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get the list of admins based on the server and their playtime also their past playtime",
            options: [
                {
                    name: "server",
                    description: "Receive the list of activities from a specific server",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                    choices: Config_1.default.get("servers").map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "pastdays",
                    description: "The amount of playtime days to count",
                    required: false,
                    type: slash_create_1.CommandOptionType.INTEGER,
                },
            ],
            dmPermission: false,
            requiredPermissions: [],
        });
    }
    hasPermission(ctx) {
        return ctx.member.roles.some((r) => Config_1.default.get("discord.roles")
            .filter((role) => role.commands.includes(this.commandName))
            .find((role) => role.Ids.includes(r)));
    }
    async run(ctx) {
        await ctx.defer();
        try {
            const options = {
                server: ctx.options.server,
                pastdays: ctx.options.pastdays || 14,
            };
            if (options.pastdays < 1) {
                return ctx.send("The amount of days to count must be at least 1");
            }
            const server = this.bot.servers.get(options.server);
            if (!server) {
                return (await ctx.send(`Server not found, existing servers are: ${[
                    ...this.bot.servers.keys(),
                ].join(", ")}`));
            }
            if (!server.rcon.connected || !server.rcon.authenticated) {
                return (await ctx.send(`Not ${!server.rcon.connected ? "connected" : "authenticated"} to server`));
            }
            const adminList = await server.rcon.getAdmins();
            const ingamePlayers = await server.rcon.getIngamePlayers();
            const currentDate = new Date().toISOString().slice(0, 10);
            let admins = [];
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inAdminActivityFile = AdminActivityConfig_1.default.get(`admins.${adminID}`);
                if (inAdminActivityFile) {
                    const activities = AdminActivityConfig_1.default.get(`admins.${adminID}.servers.${options.server}.activity`, {});
                    const lastActivities = Object.values(activities)
                        .sort()
                        .reverse();
                    lastActivities.length = options.pastdays;
                    const lastActivity = lastActivities[0] || {
                        startedAt: 0,
                        endedAt: 0,
                        duration: 0,
                    };
                    const lastActivityDate = Object.keys(activities)
                        .sort()
                        .reverse()[0];
                    admins.push({
                        id: adminID,
                        name: AdminActivityConfig_1.default.get(`admins.${adminID}.name`),
                        lastActivity: ingamePlayers.find((a) => a.id === adminID)
                            ? "online now"
                            : Boolean(lastActivity.endedAt)
                                ? lastActivity.endedAt
                                : null,
                        totalPlayTime: lastActivities.reduce((a, b, index) => a +
                            b.duration +
                            (index !== 0 &&
                                !date_fns_1.isToday(date_fns_1.parseISO(lastActivityDate))
                                ? 0
                                : !lastActivities.some((a) => a.startedAt)
                                    ? 0
                                    : Math.round((new Date().getTime() -
                                        (lastActivity.startedAt ||
                                            new Date(new Date()
                                                .toISOString()
                                                .slice(0, 10)).getTime())) /
                                        1000 /
                                        60)), 0),
                    });
                }
                else {
                    const ingamePlayer = ingamePlayers.find((a) => a.id === adminID);
                    const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || adminID) ||
                        (await server.rcon.getPlayerToCache((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || adminID));
                    AdminActivityConfig_1.default.set(`admins.${player.id}`, {
                        name: player.name,
                        servers: {
                            [server.name]: {
                                activity: {
                                    [currentDate]: {
                                        startedAt: 0,
                                        endedAt: 0,
                                        duration: 0,
                                    },
                                },
                            },
                        },
                    });
                    admins.push({
                        id: adminID,
                        name: player.name,
                        lastActivity: (ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) ? "online now" : null,
                        totalPlayTime: (ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) ? 0 : 0,
                    });
                }
            }
            const message = `**${pluralize_1.default("admin", admins.length, true)}**\n\`\`\`\n${table_1.table([
                [
                    "Rank",
                    "ID",
                    "Name",
                    `Last played (${Config_1.default.get("consoleTimezone") ||
                        Intl.DateTimeFormat().resolvedOptions().timeZone})`,
                    `Total playtime (past ${pluralize_1.default("day", options.pastdays, true)})`,
                ],
                ...admins
                    .sort((a, b) => b.totalPlayTime - a.totalPlayTime)
                    .map((admin, index) => [
                    `${index + 1}.`,
                    admin.id,
                    admin.name,
                    admin.lastActivity === "online now"
                        ? "online now"
                        : typeof admin.lastActivity === "number"
                            ? date_fns_1.formatRelative(date_fns_tz_1.utcToZonedTime(date_fns_tz_1.zonedTimeToUtc(new Date(admin.lastActivity), Intl.DateTimeFormat().resolvedOptions()
                                .timeZone), Config_1.default.get("consoleTimezone") ||
                                Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone), new Date(), {
                                weekStartsOn: 1,
                            })
                            : "never",
                    pluralize_1.default("minute", Math.round(admin.totalPlayTime / 60), true),
                ]),
            ], {
                border: table_1.getBorderCharacters("norc"),
            })}\`\`\``;
            await ctx.send({
                content: message.length > 900
                    ? `The output was too long, but was uploaded to [paste.gg](${await utils_1.hastebin(remove_markdown_1.default(message))})`
                    : message,
            });
        }
        catch (error) {
            await ctx.send(`An error occured while performing the command (${error.message || error})`);
        }
    }
}
exports.default = Admins;
