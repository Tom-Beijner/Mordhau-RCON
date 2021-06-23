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
import config from "../../../config.json";
import { LookupPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";
import { parsePlayerID } from "../../../utils/PlayerID";

export default class History extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get player's punishment history",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or the name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: {
                [config.discord.guildId]: flatMap(
                    config.discord.roles.filter((role) =>
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
        let id = ctx.options.player as string;

        const player = await Object.values(this.bot.servers).map(
            async (server) => await server.rcon.getIngamePlayer(id)
        )[0];
        id = (player && player.id) || id;
        // const playerData = this.bot.cachedPlayers.get(id) || {
        //     ids: {
        //         entityID: undefined,
        //         playFabID: platform.platform === "PlayFab" && platform.id,
        //         steamID: platform.platform === "Steam" && platform.id,
        //     },
        //     id,
        //     name: undefined,
        // };

        const playerData =
            this.bot.cachedPlayers.get(id) || (await LookupPlayer(id));

        const playerHistory = await this.bot.database.getPlayerHistory([
            ...(playerData
                ? [playerData.ids.playFabID, playerData.ids.steamID]
                : [id]),
        ]);
        let playername = player && player.name;
        let playeravatar: string;

        if (playerHistory.ids.steamID) {
            await fetch(
                `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steam.key}&steamids=${playerHistory.ids.steamID}`
            )
                .then(async (res) => {
                    const json = await res.json();
                    if (!playername)
                        playername =
                            json["response"]["players"][0]["personaname"];
                    playeravatar = json["response"]["players"][0]["avatarfull"];
                })
                .catch(() => {
                    // return { content: "Error looking up user on steam" }
                    // playername = undefined;
                    // playeravatar = undefined;
                });
        }

        const payload = {
            id,
            playername,
            playeravatar,
            duration: 0,
            history: playerHistory.history,
        };

        let pastOffenses: string;
        let historyOverTen = false;
        let pastBansAmount = 0;
        let suggestion: string;

        if (!payload.history.length) pastOffenses = "None";
        else {
            pastOffenses = "\n------------------";

            if (payload.history.length > 10) {
                historyOverTen = true;
            }

            for (let i = 0; i < payload.history.length; i++) {
                const h = payload.history[i];
                const type = h.type;
                const admin = h.admin;
                const date = new Date(h.date);

                if (type === "BAN") pastBansAmount++;

                if (h.duration) payload.duration += h.duration;

                let historyDuration: string;
                if (!h.duration) historyDuration = "PERMANENT";
                else historyDuration = pluralize("minute", h.duration, true);

                pastOffenses += `\nType: ${type}`;
                pastOffenses += `\nServer: ${h.server}`;
                pastOffenses += `\nPlatform: ${parsePlayerID(h.id).platform}`;
                pastOffenses += `\nDate: ${date.toDateString()} (${formatDistanceToNow(
                    date,
                    { addSuffix: true }
                )})\nAdmin: ${admin}\nOffense: ${
                    h.reason || "None given"
                }\nDuration: ${historyDuration} ${
                    h.duration
                        ? `(Un${
                              type === "BAN" ? "banned" : "muted"
                          } ${formatDistanceToNow(
                              addMinutes(date, h.duration),
                              {
                                  addSuffix: true,
                              }
                          )})`
                        : ""
                }\n------------------`;
            }

            if (historyOverTen)
                pastOffenses += "\nHas over 10 punishments\n------------------";

            if (pastBansAmount > 5)
                suggestion = "\n**SUGGESTION:** PERMA BAN\n";

            if (pastOffenses.length < 1025)
                pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
        }

        if (pastOffenses.length > 1024)
            pastOffenses = `The output was too long, but was uploaded to [hastebin](${await hastebin(
                pastOffenses
            )})`;

        let message = suggestion;

        const historyLength = payload.history.length;
        let color = 3066993;

        if (historyLength > 3) color = 10038562;
        if (historyLength > 2) color = 15158332;
        if (historyLength > 0) color = 15105570;

        const bannedPlayer = await this.bot.rcon.getBannedPlayer(
            playerHistory.ids.playFabID
        );

        const mutedPlayer = await this.bot.rcon.getMutedPlayer(
            playerHistory.ids.playFabID
        );

        const inServer = await this.bot.rcon.getIngamePlayer(
            playerHistory.ids.playFabID
        );

        // const archives = await this.bot.database.getArchives(
        //     playerHistory.ids.playFabID
        // );

        await ctx.send({
            content: "",
            embeds: [
                {
                    title: "HISTORY REPORT",
                    description: message,
                    fields: [
                        {
                            name: "Player",
                            value: [
                                `**Name**: \`${payload.playername}\``,
                                `**PlayFabID**: \`${playerHistory.ids.playFabID}\``,
                                `**SteamID**: [${playerHistory.ids.steamID}](<http://steamcommunity.com/profiles/${playerHistory.ids.steamID}>)`,
                                `**Previous Names**: \`${
                                    playerHistory.previousNames.length
                                        ? playerHistory.previousNames
                                        : "None"
                                }\``,
                                `**Is Banned**: \`${
                                    bannedPlayer.length
                                        ? `Yes\`\n${bannedPlayer
                                              .map(
                                                  (server) =>
                                                      `↳ **${
                                                          server.server
                                                      }**: \`${
                                                          server.data
                                                              .duration === "0"
                                                              ? "Permanent"
                                                              : `${pluralize(
                                                                    "minute",
                                                                    Number(
                                                                        server
                                                                            .data
                                                                            .duration
                                                                    ),
                                                                    true
                                                                )}, unbanned ${formatDistanceToNow(
                                                                    addMinutes(
                                                                        new Date(),
                                                                        parseInt(
                                                                            server
                                                                                .data
                                                                                .duration
                                                                        )
                                                                    ),
                                                                    {
                                                                        addSuffix:
                                                                            true,
                                                                    }
                                                                )}`
                                                      }\``
                                              )
                                              .join("\n")}`
                                        : "No`"
                                }`,
                                `**Is Muted**: \`${
                                    mutedPlayer.length
                                        ? `Yes\`\n${mutedPlayer
                                              .map(
                                                  (server) =>
                                                      `↳ **${
                                                          server.server
                                                      }**: \`${
                                                          server.data
                                                              .duration === "0"
                                                              ? "Permanent"
                                                              : `${pluralize(
                                                                    "minute",
                                                                    Number(
                                                                        server
                                                                            .data
                                                                            .duration
                                                                    ),
                                                                    true
                                                                )}, unbanned ${formatDistanceToNow(
                                                                    addMinutes(
                                                                        new Date(),
                                                                        parseInt(
                                                                            server
                                                                                .data
                                                                                .duration
                                                                        )
                                                                    ),
                                                                    {
                                                                        addSuffix:
                                                                            true,
                                                                    }
                                                                )}`
                                                      }\``
                                              )
                                              .join("\n")}`
                                        : "No`"
                                }`,
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
                            ].join("\n"),
                        },
                        // {
                        //     name: "Archives",
                        //     value:
                        //         archives
                        //             .map(
                        //                 (archive) =>
                        //                     `Video URL: [Youtube](${
                        //                         archive.videoUrl
                        //                     })\nDate: ${new Date(
                        //                         archive.createdAt
                        //                     ).toDateString()}\nAdmin: ${
                        //                         archive.admin
                        //                     }\nComment: ${archive.comment}`
                        //             )
                        //             .join("\n\n") || "None found",
                        // },
                        {
                            name: "Previous and Current Offenses",
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
    }
}
