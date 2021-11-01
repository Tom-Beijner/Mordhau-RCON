"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const date_fns_1 = require("date-fns");
const mongoose_1 = require("mongoose");
const pluralize_1 = __importDefault(require("pluralize"));
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const PlayFab_1 = require("../../../services/PlayFab");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const PlayerID_1 = require("../../../utils/PlayerID");
class DeletePunishment extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Clear history or punishment of a player or an admin",
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
                    name: "punishment_ids",
                    description: "The ID of the punishments to clear, separate them with |",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            type: ctx.options.type.toLowerCase(),
            player: ctx.options.player,
            punishmentIDs: ctx.options.punishment_ids,
        };
        const ingamePlayer = await this.bot.rcon.getIngamePlayer(ctx.options.player);
        const player = this.bot.cachedPlayers.get((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player) ||
            (await PlayFab_1.LookupPlayer((ingamePlayer === null || ingamePlayer === void 0 ? void 0 : ingamePlayer.id) || options.player));
        if (!(player === null || player === void 0 ? void 0 : player.id)) {
            return await ctx.send("Invalid player provided");
        }
        try {
            const punishmentIDs = options.punishmentIDs.split("|");
            if (punishmentIDs.some((ID) => !mongoose_1.isValidObjectId(ID)))
                return "Punishment ID must be valid";
            const punishments = await this.bot.database.getPlayerPunishment([player.ids.playFabID, player.ids.steamID], punishmentIDs, options.type === "admin");
            const message = [];
            for (let i = 0; i < punishments.length; i++) {
                const { _id, type, server, date, admin, duration, reason, id: punishedPlayerID, } = punishments[i];
                const punishedPlayer = this.bot.cachedPlayers.get(punishedPlayerID) ||
                    (await PlayFab_1.LookupPlayer(punishedPlayerID));
                message.push([
                    `ID: ${_id}`,
                    `Type: ${type}`,
                    type.includes("GLOBAL")
                        ? undefined
                        : `Server: ${server}`,
                    `Platform: ${PlayerID_1.parsePlayerID(punishedPlayerID).platform}`,
                    options.type === "admin"
                        ? `Player: ${punishedPlayer.name} (${PlayerID_1.outputPlayerIDs(punishedPlayer.ids)})`
                        : undefined,
                    `Date: ${new Date(date).toDateString()} (${date_fns_1.formatDistanceToNow(date, {
                        addSuffix: true,
                    })})`,
                    `Offense: ${reason || "None given"}`,
                    ["BAN", "MUTE", "GLOBAL BAN", "GLOBAL MUTE"].includes(type)
                        ? `Duration: ${!duration
                            ? "PERMANENT"
                            : pluralize_1.default("minute", duration, true)} ${duration
                            ? `(Un${type === "BAN" ? "banned" : "muted"} ${date_fns_1.formatDistanceToNow(date_fns_1.addMinutes(date, duration), {
                                addSuffix: true,
                            })})`
                            : ""}`
                        : undefined,
                    `Admin: ${admin}`,
                ]
                    .filter((line) => typeof line !== "undefined")
                    .join("\n"));
            }
            const completeMessage = `\`\`\`${message.join("\n------------------\n")}\`\`\``;
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: `Are you sure you want to delete \`${options.type}\` ${pluralize_1.default("punishment", punishments.length)} of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})?`,
                        fields: [
                            {
                                name: `${options.type === "player"
                                    ? "Punishment Received"
                                    : "Punishment Given"} (
                                        IDs: ${punishments.length})`,
                                value: completeMessage,
                            },
                        ],
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id)
                    return;
                await this.bot.database.deletePlayerPunishment([options.player], punishmentIDs, options.type === "admin");
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} deleted ${options.type} punishment of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: `Deleted \`${options.type}\` ${pluralize_1.default("punishment", punishments.length)} of ${player.name} (${PlayerID_1.outputPlayerIDs(player.ids, true)})`,
                            fields: [
                                {
                                    name: `Deleted Data (${punishments.length})`,
                                    value: completeMessage,
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
exports.default = DeletePunishment;
