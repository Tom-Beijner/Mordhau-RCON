"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const date_fns_1 = require("date-fns");
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const Hastebin_1 = require("../../../utils/Hastebin");
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class DeleteHistory extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Delete history of a player or an admin",
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
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
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
            let pastOffenses;
            let totalDuration = new bignumber_js_1.default(0);
            if (!playerHistory.history.length)
                pastOffenses = "None";
            else {
                pastOffenses = "------------------";
                for (let i = 0; i < playerHistory.history.length; i++) {
                    const offense = [];
                    const h = playerHistory.history[i];
                    const type = h.type;
                    const admin = h.admin;
                    const date = new Date(h.date);
                    let historyDuration;
                    if (h.duration.isEqualTo(0))
                        historyDuration = "PERMANENT";
                    else {
                        historyDuration = pluralize_1.default("minute", h.duration.toNumber(), true);
                        totalDuration.plus(h.duration);
                    }
                    offense.push([
                        `\nID: ${i + 1}`,
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
                            ? `Duration: ${historyDuration} ${h.duration.isEqualTo(0)
                                ? ""
                                : `(Un${["BAN", "GLOBAL BAN"].includes(type)
                                    ? "banned"
                                    : "muted"} ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(date, h.duration.toNumber()), { addSuffix: true })})`}`
                            : undefined,
                        `------------------`,
                    ]
                        .filter((line) => typeof line !== "undefined")
                        .join("\n"));
                    pastOffenses += offense.join("\n");
                }
                if (pastOffenses.length < 1025)
                    pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
            }
            if (pastOffenses.length > 1024)
                pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await Hastebin_1.hastebin(pastOffenses)})`;
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: `Are you sure you want to delete \`${options.type}\` history of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})?`,
                        fields: [
                            {
                                name: options.type === "player"
                                    ? `Previous Offenses (${playerHistory.history.length})`
                                    : `Punishments Given (${playerHistory.history.length})`,
                                value: pastOffenses,
                            },
                        ],
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id)
                    return;
                await this.bot.database.deletePlayerHistory([options.player], options.type === "admin");
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} deleted ${options.type} history of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: `Cleared \`${options.type}\` punishment of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`,
                            fields: [
                                {
                                    name: `Deleted Data (${playerHistory.history.length})`,
                                    value: pastOffenses,
                                },
                            ],
                        },
                    ],
                    components: [],
                });
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = DeleteHistory;
