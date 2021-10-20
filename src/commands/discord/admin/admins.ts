import flatMap from "array.prototype.flatmap";
import { formatRelative, isToday, parseISO } from "date-fns";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import { getBorderCharacters, table } from "table";
import { LookupPlayer } from "../../../services/PlayFab";
import AdminActivityConfig from "../../../structures/AdminActivityConfig";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";

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
            defaultPermission: false,
            permissions: {
                [config.get("discord.guildId") as string]: flatMap(
                    (config.get("discord.roles") as Role[]).filter((role) =>
                        role.commands.includes(commandName)
                    ),
                    (role) =>
                        role.Ids.map((id) => ({
                            type: ApplicationCommandPermissionType.ROLE,
                            id,
                            permission: true,
                        }))
                ),
            },
        });
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
                    `Not ${
                        !server.rcon.connected ? "connected" : "authenticated"
                    } to server`
                )) as Message;
            }

            let admins: {
                id: string;
                name: string;
                lastActivity: string;
                totalPlayTime: number;
                punishmentsMade?: number;
            }[] = [];
            for (const adminID in AdminActivityConfig.get("admins")) {
                const activities = AdminActivityConfig.get(
                    `admins.${adminID}.servers.${options.server}.activity`
                ) as {
                    [date: string]: { startedAt: number; duration: number };
                };

                const lastActivities = Object.values(activities)
                    .sort()
                    .reverse();
                lastActivities.length = options.pastdays;
                const lastActivity = Object.keys(activities)
                    .sort()
                    .reverse()[0];

                admins.push({
                    id: adminID,
                    name: AdminActivityConfig.get(`admins.${adminID}.name`),
                    lastActivity: lastActivity,
                    totalPlayTime: lastActivities.reduce(
                        (a, b, index) =>
                            a +
                            b.duration +
                            (index !== lastActivities.length - 1 &&
                            !isToday(parseISO(lastActivity))
                                ? 0
                                : Math.round(
                                      (new Date().getTime() -
                                          (lastActivities[0].startedAt ||
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
            }

            const leftAdmins = (await server.rcon.getAdmins()).filter(
                (a) => !admins.find((b) => b.id === a)
            );

            for (let i = 0; i < leftAdmins.length; i++) {
                const ingamePlayer = await server.rcon.getIngamePlayer(
                    leftAdmins[i]
                );
                const player =
                    this.bot.cachedPlayers.get(
                        ingamePlayer?.id || leftAdmins[i]
                    ) ||
                    (await LookupPlayer(ingamePlayer?.id || leftAdmins[i]));

                admins.push({
                    id: leftAdmins[i],
                    name: player.name,
                    lastActivity: ingamePlayer?.id
                        ? new Date().toISOString().slice(0, 10)
                        : null,
                    totalPlayTime: ingamePlayer?.id ? 0 : 0,
                });
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
                        "Last played",
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
                            admin.lastActivity
                                ? formatRelative(
                                      parseISO(admin.lastActivity),
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
            )}\n\`\`\``;

            await ctx.send({
                content:
                    message.length > 900
                        ? `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                              message
                          )})`
                        : message,
            });
        } catch (error) {
            await ctx.send(
                `An error occured while performing the command (${
                    error.message || error
                })`
            );
        }
    }
}
