import flatMap from 'array.prototype.flatmap';
import { formatRelative, isToday, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import pluralize from 'pluralize';
import removeMarkdown from 'remove-markdown';
import { CommandContext, CommandOptionType, Message, SlashCreator } from 'slash-create';
import { getBorderCharacters, table } from 'table';

import AdminActivityConfig from '../../../structures/AdminActivityConfig';
import config, { Role } from '../../../structures/Config';
import SlashCommand from '../../../structures/SlashCommand';
import Watchdog from '../../../structures/Watchdog';

export default class Admins extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description:
                "Get the list of admins based on the server and their playtime also their past playtime",
            options: [
                {
                    name: "server",
                    description:
                        "Receive the list of activities from a specific server",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.get("servers").map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
                },
                {
                    name: "pastdays",
                    description: "The amount of playtime days to count",
                    required: false,
                    type: CommandOptionType.INTEGER,
                },
            ],
            dmPermission: false,
            requiredPermissions: [],
            // permissions: Object.assign(
            //     {},
            //     ...bot.client.guilds.map((guild) => ({
            //         [guild.id]: flatMap(
            //             (config.get("discord.roles") as Role[]).filter((role) =>
            //                 role.commands.includes(commandName)
            //             ),
            //             (role) =>
            //                 role.Ids.map((id) => ({
            //                     type: ApplicationCommandPermissionType.ROLE,
            //                     id,
            //                     permission: true,
            //                 }))
            //         ),
            //     }))
            // ),
        });
    }

    hasPermission(ctx: CommandContext): string | boolean {
        // const permissions = Object.assign(
        //     {},
        //     ...this.bot.client.guilds.map((guild) => ({
        //         [guild.id]: flatMap(
        //             (config.get("discord.roles") as Role[]).filter((role) =>
        //                 role.commands.includes(this.commandName)
        //             ),
        //             (role) =>
        //                 role.Ids.map((id) => ({
        //                     type: ApplicationCommandPermissionType.ROLE,
        //                     id,
        //                     permission: true,
        //                 }))
        //         ),
        //     }))
        // );

        // return (
        //     permissions[ctx.guildID]?.some((permission) =>
        //         ctx.member.roles.includes(permission.id)
        //     ) ?? false
        // );

        return ctx.member.roles.some((r) =>
            (config.get("discord.roles") as Role[])
                .filter((role) => role.commands.includes(this.commandName))
                .find((role) => role.Ids.includes(r))
        );
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        try {
            const options = {
                server: ctx.options.server as string,
                pastdays: (ctx.options.pastdays as number) || 14,
            };

            if (options.pastdays < 1) {
                return ctx.send(
                    "The amount of days to count must be at least 1"
                );
            }

            const server = this.bot.servers.get(options.server);
            if (!server) {
                return (await ctx.send(
                    `Server not found, existing servers are: ${[
                        ...this.bot.servers.keys(),
                    ].join(", ")}`
                )) as Message;
            }
            if (!server.rcon.connected || !server.rcon.authenticated) {
                return (await ctx.send(
                    `Not ${!server.rcon.connected ? "connected" : "authenticated"
                    } to server`
                )) as Message;
            }

            const adminList = await server.rcon.getAdmins();
            const ingamePlayers = await server.rcon.getIngamePlayers();
            const currentDate = new Date().toISOString().slice(0, 10);

            let admins: {
                id: string;
                name: string;
                lastActivity: number | string;
                totalPlayTime: number;
                punishmentsMade?: number;
            }[] = [];
            for (let i = 0; i < adminList.length; i++) {
                const adminID = adminList[i];
                const inAdminActivityFile = AdminActivityConfig.get(
                    `admins.${adminID}`
                );

                if (inAdminActivityFile) {
                    const activities = AdminActivityConfig.get(
                        `admins.${adminID}.servers.${options.server}.activity`,
                        {}
                    ) as {
                        [date: string]: {
                            startedAt: number;
                            endedAt: number;
                            duration: number;
                        };
                    };

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
                        name: AdminActivityConfig.get(`admins.${adminID}.name`),
                        lastActivity: ingamePlayers.find(
                            (a) => a.id === adminID
                        )
                            ? "online now"
                            : Boolean(lastActivity.endedAt)
                                ? lastActivity.endedAt
                                : null,
                        totalPlayTime: lastActivities.reduce(
                            (a, b, index) =>
                                a +
                                b.duration +
                                (index !== 0 &&
                                    !isToday(parseISO(lastActivityDate))
                                    ? 0
                                    : !lastActivities.some((a) => a.startedAt)
                                        ? 0
                                        : Math.round(
                                            (new Date().getTime() -
                                                (lastActivity.startedAt ||
                                                    new Date(
                                                        new Date()
                                                            .toISOString()
                                                            .slice(0, 10)
                                                    ).getTime())) /
                                            1000 /
                                            60
                                        )),
                            0
                        ),
                    });
                } else {
                    const ingamePlayer = ingamePlayers.find(
                        (a) => a.id === adminID
                    );
                    const player =
                        this.bot.cachedPlayers.get(
                            ingamePlayer?.id || adminID
                        ) ||
                        (await server.rcon.getPlayerToCache(
                            ingamePlayer?.id || adminID
                        ));

                    AdminActivityConfig.set(`admins.${player.id}`, {
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
                        lastActivity: ingamePlayer?.id ? "online now" : null,
                        totalPlayTime: ingamePlayer?.id ? 0 : 0,
                    });
                }
            }

            // const punishmentsMade = await this.bot.database.Logs.aggregate([
            //     {
            //         $match: {
            //             admin: {
            //                 $regex: admins.map((a) => a.id).join("|"),
            //             },
            //             // createdAt: {
            //             //     $gte: subDays(new Date(), options.pastdays),
            //             // },
            //         },
            //     },
            //     {
            //         $group: {
            //             _id: {
            //                 admin: {
            //                     $regex: admins.map((a) => a.id).join("|"),
            //                 },
            //             },
            //             count: { $sum: 1 },
            //         },
            //     },
            // ]);
            // console.log(punishmentsMade);
            // admins = admins.map(a => )

            const message = `**${pluralize(
                "admin",
                admins.length,
                true
            )}**\n\`\`\`\n${table(
                [
                    [
                        "Rank",
                        "ID",
                        "Name",
                        `Last played (${config.get("consoleTimezone") ||
                        Intl.DateTimeFormat().resolvedOptions().timeZone
                        })`,
                        `Total playtime (past ${pluralize(
                            "day",
                            options.pastdays,
                            true
                        )})`,
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
                                    ? formatRelative(
                                        utcToZonedTime(
                                            zonedTimeToUtc(
                                                new Date(admin.lastActivity),
                                                Intl.DateTimeFormat().resolvedOptions()
                                                    .timeZone
                                            ),
                                            config.get("consoleTimezone") ||
                                            Intl.DateTimeFormat().resolvedOptions()
                                                .timeZone
                                        ),
                                        new Date(),
                                        {
                                            weekStartsOn: 1,
                                        }
                                    )
                                    : "never",
                            pluralize(
                                "minute",
                                Math.round(admin.totalPlayTime / 60),
                                true
                            ),
                        ]),
                ],
                {
                    border: getBorderCharacters("norc"),
                    // border: {
                    //     topBody: "",
                    //     topJoin: "",
                    //     topLeft: "",
                    //     topRight: "",

                    //     bottomBody: "",
                    //     bottomJoin: "",
                    //     bottomLeft: "",
                    //     bottomRight: "",

                    //     bodyLeft: "",
                    //     bodyRight: "",
                    //     bodyJoin: "",

                    //     joinBody: "",
                    //     joinLeft: "",
                    //     joinRight: "",
                    //     joinJoin: "",
                    // },
                    // drawVerticalLine: () => false,
                    // drawHorizontalLine: (lineIndex) => lineIndex === 1,
                }
            )}\`\`\``;

            let attachment: Buffer
            if (message.length > 900) {
                attachment = Buffer.from(
                    removeMarkdown(message)
                )
            }

            await ctx.send({
                content:
                    message.length > 900
                        ? "See attached text file"
                        : message,
                ...(message.length > 900 && {
                    file: {
                        file: attachment,
                        name: "Output.txt"
                    }
                })
            });
        } catch (error) {
            await ctx.send(
                `An error occured while performing the command (${error.message || error
                })`
            );
        }
    }
}
