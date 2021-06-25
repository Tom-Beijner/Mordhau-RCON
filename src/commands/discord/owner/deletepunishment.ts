import flatMap from "array.prototype.flatmap";
import { addMinutes, formatDistanceToNow } from "date-fns";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import { ComponentConfirmation } from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import { outputPlayerIDs, parsePlayerID } from "../../../utils/PlayerID";

export default class DeletePunishment extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Clear history or punishment of a player or an admin",
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
                    name: "punishment_id",
                    description: "The ID of the punishment to clear",
                    required: true,
                    type: CommandOptionType.INTEGER,
                },
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
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
        const options = {
            type: ctx.options.type.toLowerCase() as string,
            player: ctx.options.player as string,
            punishmentID: ctx.options.punishment_id as number,
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
            if (options.punishmentID < 1)
                return "Punishment ID must be at least 1";

            const {
                punishment: {
                    type,
                    server,
                    date,
                    admin,
                    duration,
                    reason,
                    id: punishedPlayerID,
                },
            } = await this.bot.database.getPlayerPunishment(
                [player.ids.playFabID, player.ids.steamID],
                options.punishmentID,
                options.type === "admin"
            );

            const punishedPlayer =
                this.bot.cachedPlayers.get(punishedPlayerID) ||
                (await LookupPlayer(punishedPlayerID));

            const message = [
                `\`\`\`Type: ${type}`,
                type.includes("GLOBAL") ? undefined : `Server: ${server}`,
                `Platform: ${parsePlayerID(punishedPlayerID).platform}`,
                options.type === "admin"
                    ? `Player: ${punishedPlayer.name} (${outputPlayerIDs(
                          punishedPlayer.ids
                      )})`
                    : undefined,
                `Date: ${new Date(date).toDateString()} (${formatDistanceToNow(
                    date,
                    { addSuffix: true }
                )})`,
                `Offense: ${reason || "None given"}`,
                ["BAN", "MUTE", "GLOBAL BAN", "GLOBAL MUTE"].includes(type)
                    ? `Duration: ${
                          !duration
                              ? "PERMANENT"
                              : pluralize("minute", duration, true)
                      } ${
                          duration
                              ? `(Un${
                                    type === "BAN" ? "banned" : "muted"
                                } ${formatDistanceToNow(
                                    addMinutes(date, duration),
                                    {
                                        addSuffix: true,
                                    }
                                )})`
                              : ""
                      }`
                    : undefined,
                `Admin: ${admin}\`\`\``,
            ]
                .filter((line) => typeof line !== "undefined")
                .join("\n");

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: `Are you sure you want to delete \`${
                                options.type
                            }\` punishment of ${player.name} (${outputPlayerIDs(
                                player.ids,
                                true
                            )})?`,
                            fields: [
                                {
                                    name:
                                        options.type === "player"
                                            ? `Punishment Received (ID: ${options.punishmentID})`
                                            : `Punishment Given (ID: ${options.punishmentID})`,
                                    value: message,
                                },
                            ],
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id) return;

                    await this.bot.database.deletePlayerPunishment(
                        [options.player],
                        options.punishmentID,
                        options.type === "admin"
                    );

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } deleted ${options.type} punishment of ${
                            player.name
                        } (${outputPlayerIDs(player.ids, true)})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: `Swlwrws \`${
                                    options.type
                                }\` punishment of ${
                                    player.name
                                } (${outputPlayerIDs(player.ids, true)})`,
                                fields: [
                                    {
                                        name: `Deleted Data (ID: ${options.punishmentID})`,
                                        value: message,
                                    },
                                ],
                            },
                        ],
                        components: [],
                    });
                }
            );
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
