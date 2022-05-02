import flatMap from "array.prototype.flatmap";
import { addMinutes, formatDistanceToNow } from "date-fns";
import { isValidObjectId, ObjectId } from "mongoose";
import pluralize from "pluralize";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import { ComponentConfirmation } from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import config, { Role } from "../../../structures/Config";
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
                    name: "punishment_ids",
                    description:
                        "The ID of the punishments to clear, separate them with |",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
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
        const options = {
            type: ctx.options.type.toLowerCase() as string,
            player: ctx.options.player as string,
            punishmentIDs: ctx.options.punishment_ids as string,
        };

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(
            ctx.options.player as string
        );
        const player =
            this.bot.cachedPlayers.get(ingamePlayer?.id || options.player) ||
            (await LookupPlayer(ingamePlayer?.id || options.player));

        if (!player?.id) {
            return await ctx.send("Invalid player provided");
        }

        try {
            const punishmentIDs = options.punishmentIDs.split("|");
            if (punishmentIDs.some((ID) => !isValidObjectId(ID)))
                return "Punishment ID must be valid";

            const punishments = await this.bot.database.getPlayerPunishment(
                [player.ids.playFabID, player.ids.steamID],
                punishmentIDs as unknown as ObjectId[],
                options.type === "admin"
            );

            const message = [];

            for (let i = 0; i < punishments.length; i++) {
                const {
                    _id,
                    type,
                    server,
                    date,
                    admin,
                    duration,
                    reason,
                    id: punishedPlayerID,
                } = punishments[i];

                const punishedPlayer =
                    this.bot.cachedPlayers.get(punishedPlayerID) ||
                    (await LookupPlayer(punishedPlayerID));

                message.push(
                    [
                        `ID: ${_id}`,
                        `Type: ${type}`,
                        type.includes("GLOBAL")
                            ? undefined
                            : `Server: ${server}`,
                        `Platform: ${parsePlayerID(punishedPlayerID).platform}`,
                        options.type === "admin"
                            ? `Player: ${
                                  punishedPlayer.name
                              } (${outputPlayerIDs(punishedPlayer.ids)})`
                            : undefined,
                        `Date: ${new Date(
                            date
                        ).toDateString()} (${formatDistanceToNow(date, {
                            addSuffix: true,
                        })})`,
                        `Offense: ${reason || "None given"}`,
                        ["BAN", "MUTE", "GLOBAL BAN", "GLOBAL MUTE"].includes(
                            type
                        )
                            ? `Duration: ${
                                  duration.isEqualTo(0)
                                      ? "PERMANENT"
                                      : pluralize(
                                            "minute",
                                            duration.toNumber(),
                                            true
                                        )
                              } ${
                                  duration.isEqualTo(0)
                                      ? ""
                                      : `(Un${
                                            type === "BAN" ? "banned" : "muted"
                                        } ${formatDistanceToNow(
                                            addMinutes(
                                                date,
                                                duration.toNumber()
                                            ),
                                            {
                                                addSuffix: true,
                                            }
                                        )})`
                              }`
                            : undefined,
                        `Admin: ${admin}`,
                    ]
                        .filter((line) => typeof line !== "undefined")
                        .join("\n")
                );
            }

            const completeMessage = `\`\`\`${message.join(
                "\n------------------\n"
            )}\`\`\``;

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: `Are you sure you want to delete \`${
                                options.type
                            }\` ${pluralize(
                                "punishment",
                                punishments.length
                            )} of ${player.name} (${outputPlayerIDs(
                                player.ids,
                                true
                            )})?`,
                            fields: [
                                {
                                    name: `${
                                        options.type === "player"
                                            ? "Punishment Received"
                                            : "Punishment Given"
                                    } (
                                        IDs: ${punishments.length})`,
                                    value: completeMessage,
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
                        punishmentIDs as unknown as ObjectId[],
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
                                description: `Deleted \`${
                                    options.type
                                }\` ${pluralize(
                                    "punishment",
                                    punishments.length
                                )} of ${player.name} (${outputPlayerIDs(
                                    player.ids,
                                    true
                                )})`,
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
