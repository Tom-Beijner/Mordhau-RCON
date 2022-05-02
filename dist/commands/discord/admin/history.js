"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const date_fns_1 = require("date-fns");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const utils_1 = require("../../../utils");
const PlayerID_1 = require("../../../utils/PlayerID");
class History extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get player's or admin's punishment history",
            options: [
                {
                    name: "type",
                    description: "Type of player to clear",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
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
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
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
        const options = {
            type: ctx.options.type.toLowerCase(),
            player: ctx.options.player,
        };
        const ingamePlayer = await this.bot.rcon.getIngamePlayer(ctx.options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) ||
            (await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player));
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.send("Invalid player provided");
        }
        try {
            const playerHistory = await this.bot.database.getPlayerHistory([player.ids.playFabID, player.ids.steamID], options.type === "admin");
            let playername = player && player.name;
            let playeravatar;
            if (playerHistory.ids.steamID) {
                await node_fetch_1.default(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${Config_1.default.get("steam.key")}&steamids=${playerHistory.ids.steamID}`)
                    .then(async (res) => {
                    const json = await res.json();
                    if (!playername)
                        playername =
                            json["response"]["players"][0]["personaname"];
                    playeravatar =
                        json["response"]["players"][0]["avatarfull"];
                })
                    .catch(() => {
                });
            }
            const payload = {
                id: player.id,
                playername,
                playeravatar,
                duration: new bignumber_js_1.default(0),
                history: playerHistory.history,
            };
            let pastOffenses;
            let pastBansAmount = 0;
            if (!payload.history.length)
                pastOffenses = "None";
            else {
                pastOffenses = "------------------";
                for (let i = 0; i < payload.history.length; i++) {
                    const offenses = [];
                    const h = payload.history[i];
                    const type = h.type;
                    const admin = h.admin;
                    const date = new Date(h.date);
                    if (type === "BAN")
                        pastBansAmount++;
                    let historyDuration;
                    if (!h.duration ||
                        h.duration.isEqualTo(0) ||
                        h.duration.isNaN())
                        historyDuration = "PERMANENT";
                    else {
                        historyDuration = pluralize_1.default("minute", h.duration.toNumber(), true);
                        payload.duration = payload.duration.plus(h.duration);
                    }
                    offenses.push([
                        `\nID: ${h._id}`,
                        `Type: ${type}`,
                        type.includes("GLOBAL")
                            ? undefined
                            : `Server: ${h.server}`,
                        `Platform: ${PlayerID_1.parsePlayerID(h.id).platform}`,
                        options.type === "admin"
                            ? `Player: ${h.player} (${PlayerID_1.outputPlayerIDs(h.ids.length
                                ? h.ids
                                : [
                                    {
                                        platform: PlayerID_1.parsePlayerID(h.id).platform,
                                        id: h.id,
                                    },
                                ])})`
                            : undefined,
                        `Date: ${date.toDateString()} (${date_fns_1.formatDistanceToNow(date, { addSuffix: true })})`,
                        `Admin: ${admin}`,
                        `Offense: ${h.reason || "None given"}`,
                        [
                            "BAN",
                            "MUTE",
                            "GLOBAL BAN",
                            "GLOBAL MUTE",
                        ].includes(type)
                            ? `Duration: ${historyDuration} ${!h.duration ||
                                h.duration.isEqualTo(0) ||
                                h.duration.isNaN()
                                ? ""
                                : `(Un${["BAN", "GLOBAL BAN"].includes(type)
                                    ? "banned"
                                    : "muted"} ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(date, h.duration.toNumber()), { addSuffix: true })})`}`
                            : undefined,
                        `------------------`,
                    ]
                        .filter((line) => typeof line !== "undefined")
                        .join("\n"));
                    pastOffenses += offenses.join("\n");
                }
                if (pastOffenses.length < 1025)
                    pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
            }
            if (pastOffenses.length > 1024)
                pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await utils_1.hastebin(pastOffenses)})`;
            let message = "";
            const historyLength = payload.history.length;
            let color;
            if (options.type === "player") {
                color = 3066993;
                if (historyLength > 0)
                    color = 15105570;
                if (historyLength > 2)
                    color = 15158332;
                if (historyLength > 3)
                    color = 10038562;
            }
            const inServer = await this.bot.rcon.getIngamePlayer(playerHistory.ids.playFabID);
            await ctx.send({
                content: "",
                embeds: [
                    {
                        title: `${options.type.toUpperCase()} HISTORY REPORT`,
                        description: message,
                        fields: [
                            {
                                name: options.type[0].toUpperCase() +
                                    options.type.substr(1),
                                value: [
                                    `**Name**: \`${payload.playername}\``,
                                    `**PlayFabID**: \`${playerHistory.ids.playFabID}\``,
                                    `**SteamID**: [${playerHistory.ids.steamID}](<http://steamcommunity.com/profiles/${playerHistory.ids.steamID}>)`,
                                    options.type === "player"
                                        ? `**Previous Names**: \`${playerHistory.previousNames.length
                                            ? playerHistory.previousNames
                                            : "None"}\``
                                        : undefined,
                                    `**In A Server**: \`${inServer
                                        ? `Yes in ${inServer.server}`
                                        : "No"}\``,
                                    `**Total Duration**: \`${pluralize_1.default("minute", payload.duration.toNumber(), true)}\`\n`,
                                ]
                                    .filter((line) => typeof line !== "undefined")
                                    .join("\n"),
                            },
                            {
                                name: options.type === "player"
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
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = History;
