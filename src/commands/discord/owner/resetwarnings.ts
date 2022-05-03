import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import {
    ComponentConfirmation,
    sendWebhookMessage,
} from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import parseOut from "../../../utils/parseOut";
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

export default class ResetWarnings extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Reset a player's warnings",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
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
        const options = {
            player: ctx.options.player as string,
        };

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(
            options.player
        );
        const player =
            this.bot.cachedPlayers.get(ingamePlayer?.id || options.player) ||
            (await LookupPlayer(ingamePlayer?.id || options.player));

        if (!player?.id) {
            return await ctx.send("Invalid player provided");
        }

        try {
            const playerWarns = await this.bot.database.Warns.findOne({
                id: player.id,
            });

            if (!playerWarns || playerWarns.infractions === 0)
                return `${player.name} (${outputPlayerIDs(
                    player.ids,
                    true
                )}) has not been warned`;

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: [
                                `Are you sure you want to reset warnings of ${
                                    player.name
                                } (${outputPlayerIDs(player.ids, true)})?\n`,
                                `Warnings: ${playerWarns.infractions}`,
                            ].join("\n"),
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id) return;

                    await this.bot.database.Warns.deleteOne({ id: player.id });

                    for (const [serverName, server] of this.bot.servers) {
                        sendWebhookMessage(
                            server.rcon.webhooks.get("warns"),
                            `${ctx.member.displayName}#${
                                ctx.member.user.discriminator
                            } (${ctx.member.id}) reset ${parseOut(
                                player.name
                            )}'s (${outputPlayerIDs(
                                player.ids,
                                true
                            )}) warnings (Previous warnings: ${
                                playerWarns.infractions - 1
                            })`
                        );
                    }

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } reset ${player.name}'s (${
                            player.id
                        }) warnings (Previous warnings: ${
                            playerWarns.infractions - 1
                        })`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `Reset ${player.name}'s (${outputPlayerIDs(
                                        player.ids
                                    )}) warnings\n`,
                                    `Previous warnings: ${
                                        playerWarns.infractions - 1
                                    }`,
                                ].join("\n"),
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
