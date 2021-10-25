import flatMap from "array.prototype.flatmap";
import { addMinutes, formatDistanceToNow } from "date-fns";
import fetch from "node-fetch";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import { LookupPlayer } from "../../../services/PlayFab";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";
import { outputPlayerIDs, parsePlayerID } from "../../../utils/PlayerID";

export default class History extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get player's or admin's punishment history",
            options: [
                {
                    name: "type",
                    description: "Type of player to clear",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: [
                        {
                            name: "Player",
                            value: "Player",
                        },
                        {
                            name: "Admin",
                            value: "Admin",
                        },
                    ],
                },
                {
                    name: "player",
                    description: "PlayFab ID or the name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign(
                {},
                ...bot.client.guilds.map((guild) => ({
                    [guild.id]: flatMap(
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
                }))
            ),
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            type: ctx.options.type.toLowerCase() as "player" | "admin",
            player: ctx.options.player as string,
        };

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(
            ctx.options.player as string
        );
        const player =
            this.bot.cachedPlayers.get(ingamePlayer?.id || options.player) ||
            (await LookupPlayer(ingamePlayer?.id || options.player));

        if (!player?.id) {
            return await ctx.send(`Invalid player provided`);
        }

        try {
            const playerHistory = await this.bot.database.getPlayerHistory(
                [player.ids.playFabID, player.ids.steamID],
                options.type === "admin"
            );
            let playername = player && player.name;
            let playeravatar: string;

            if (playerHistory.ids.steamID) {
                await fetch(
                    `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.get(
                        "steam.key"
                    )}&steamids=${playerHistory.ids.steamID}`
                )
                    .then(async (res) => {
                        const json = await res.json();
                        if (!playername)
                            playername =
                                json["response"]["players"][0]["personaname"];
                        playeravatar =
                            json["response"]["players"][0]["avatarfull"];
                    })
                    .catch(() => {
                        // return { content: "Error looking up user on steam" }
                        // playername = undefined;
                        // playeravatar = undefined;
                    });
            }

            const payload = {
                id: player.id,
                playername,
                playeravatar,
                duration: 0,
                history: playerHistory.history,
            };

            let pastOffenses: string;
            let pastBansAmount = 0;

            if (!payload.history.length) pastOffenses = "None";
            else {
                pastOffenses = "------------------";

                for (let i = 0; i < payload.history.length; i++) {
                    const offenses: string[] = [];
                    const h = payload.history[i];
                    const type = h.type;
                    const admin = h.admin;
                    const date = new Date(h.date);

                    if (type === "BAN") pastBansAmount++;

                    if (h.duration) payload.duration += h.duration;

                    let historyDuration: string;
                    if (!h.duration) historyDuration = "PERMANENT";
                    else
                        historyDuration = pluralize("minute", h.duration, true);

                    offenses.push(
                        [
                            `\nID: ${h._id}`,
                            `Type: ${type}`,
                            type.includes("GLOBAL")
                                ? undefined
                                : `Server: ${h.server}`,
                            `Platform: ${parsePlayerID(h.id).platform}`,
                            options.type === "admin"
                                ? `Player: ${h.player} (${outputPlayerIDs(
                                      h.ids.length
                                          ? h.ids
                                          : [
                                                {
                                                    platform: parsePlayerID(
                                                        h.id
                                                    ).platform,
                                                    id: h.id,
                                                },
                                            ]
                                  )})`
                                : undefined,
                            `Date: ${date.toDateString()} (${formatDistanceToNow(
                                date,
                                { addSuffix: true }
                            )})`,
                            `Admin: ${admin}`,
                            `Offense: ${h.reason || "None given"}`,
                            [
                                "BAN",
                                "MUTE",
                                "GLOBAL BAN",
                                "GLOBAL MUTE",
                            ].includes(type)
                                ? `Duration: ${historyDuration} ${
                                      h.duration
                                          ? `(Un${
                                                ["BAN", "GLOBAL BAN"].includes(
                                                    type
                                                )
                                                    ? "banned"
                                                    : "muted"
                                            } ${formatDistanceToNow(
                                                addMinutes(date, h.duration),
                                                { addSuffix: true }
                                            )})`
                                          : ""
                                  }`
                                : undefined,
                            `------------------`,
                        ]
                            .filter((line) => typeof line !== "undefined")
                            .join("\n")
                    );

                    pastOffenses += offenses.join("\n");
                }

                if (pastOffenses.length < 1025)
                    pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
            }

            if (pastOffenses.length > 1024)
                pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                    pastOffenses
                )})`;
            let message = "";

            const historyLength = payload.history.length;
            let color: number;

            if (options.type === "player") {
                color = 3066993;
                if (historyLength > 0) color = 15105570;
                if (historyLength > 2) color = 15158332;
                if (historyLength > 3) color = 10038562;
            }

            // const bannedPlayer = await this.bot.rcon.getBannedPlayer(
            //     playerHistory.ids.playFabID
            // );

            // const mutedPlayer = await this.bot.rcon.getMutedPlayer(
            //     playerHistory.ids.playFabID
            // );

            const inServer = await this.bot.rcon.getIngamePlayer(
                playerHistory.ids.playFabID
            );

            await ctx.send({
                content: "",
                embeds: [
                    {
                        title: `${options.type.toUpperCase()} HISTORY REPORT`,
                        description: message,
                        fields: [
                            {
                                name:
                                    options.type[0].toUpperCase() +
                                    options.type.substr(1),
                                value: [
                                    `**Name**: \`${payload.playername}\``,
                                    `**PlayFabID**: \`${playerHistory.ids.playFabID}\``,
                                    `**SteamID**: [${playerHistory.ids.steamID}](<http://steamcommunity.com/profiles/${playerHistory.ids.steamID}>)`,
                                    options.type === "player"
                                        ? `**Previous Names**: \`${
                                              playerHistory.previousNames.length
                                                  ? playerHistory.previousNames
                                                  : "None"
                                          }\``
                                        : undefined,
                                    // `**Is Banned**: \`${
                                    //     bannedPlayer.length
                                    //         ? `Yes\`\n${bannedPlayer
                                    //               .map(
                                    //                   (server) =>
                                    //                       `↳ **${
                                    //                           server.server
                                    //                       }**: \`${
                                    //                           server.data
                                    //                               .duration === "0"
                                    //                               ? "Permanent"
                                    //                               : `${pluralize(
                                    //                                     "minute",
                                    //                                     Number(
                                    //                                         server
                                    //                                             .data
                                    //                                             .duration
                                    //                                     ),
                                    //                                     true
                                    //                                 )}, unbanned ${formatDistanceToNow(
                                    //                                     addMinutes(
                                    //                                         new Date(),
                                    //                                         parseInt(
                                    //                                             server
                                    //                                                 .data
                                    //                                                 .duration
                                    //                                         )
                                    //                                     ),
                                    //                                     {
                                    //                                         addSuffix:
                                    //                                             true,
                                    //                                     }
                                    //                                 )}`
                                    //                       }\``
                                    //               )
                                    //               .join("\n")}`
                                    //         : "No`"
                                    // }`,
                                    // `**Is Muted**: \`${
                                    //     mutedPlayer.length
                                    //         ? `Yes\`\n${mutedPlayer
                                    //               .map(
                                    //                   (server) =>
                                    //                       `↳ **${
                                    //                           server.server
                                    //                       }**: \`${
                                    //                           server.data
                                    //                               .duration === "0"
                                    //                               ? "Permanent"
                                    //                               : `${pluralize(
                                    //                                     "minute",
                                    //                                     Number(
                                    //                                         server
                                    //                                             .data
                                    //                                             .duration
                                    //                                     ),
                                    //                                     true
                                    //                                 )}, unbanned ${formatDistanceToNow(
                                    //                                     addMinutes(
                                    //                                         new Date(),
                                    //                                         parseInt(
                                    //                                             server
                                    //                                                 .data
                                    //                                                 .duration
                                    //                                         )
                                    //                                     ),
                                    //                                     {
                                    //                                         addSuffix:
                                    //                                             true,
                                    //                                     }
                                    //                                 )}`
                                    //                       }\``
                                    //               )
                                    //               .join("\n")}`
                                    //         : "No`"
                                    // }`,
                                    `**In A Server**: \`${
                                        inServer
                                            ? `Yes in ${inServer.server}`
                                            : "No"
                                    }\``,
                                    `**Total Duration**: \`${pluralize(
                                        "minute",
                                        payload.duration,
                                        true
                                    )}\`\n`,
                                ]
                                    .filter(
                                        (line) => typeof line !== "undefined"
                                    )
                                    .join("\n"),
                            },
                            {
                                name:
                                    options.type === "player"
                                        ? `Previous Offenses (${playerHistory.history.length})`
                                        : `Punishments Given (${playerHistory.history.length})`,
                                value: pastOffenses,
                            },
                        ],
                        color,
                        image: {
                            url: payload.playeravatar,
                        },
                    },
                ],
            });
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
