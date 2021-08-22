import flatMap from "array.prototype.flatmap";
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
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class GlobalUnban extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Globally unban a player",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID of the player",
                    required: true,
                    type: CommandOptionType.STRING,
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
        const options = {
            player: ctx.options.player as string,
        };

        const player =
            this.bot.cachedPlayers.get(options.player) ||
            (await LookupPlayer(options.player));

        if (!player?.id) {
            return await ctx.send(`Invalid player provided`);
        }

        try {
            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: `Are you sure you want to globally unban ${player.name} (${player.id})?`,
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id) return;
                    const result = await this.bot.rcon.globalUnban(
                        {
                            ids: { playFabID: ctx.member.id },
                            id: ctx.member.id,
                            name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                        },
                        player
                    );
                    const failedServers = result.filter(
                        (result) => result.data.failed
                    );

                    const allServersFailed =
                        this.bot.servers.size === failedServers.length;

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        }${allServersFailed ? " tried to" : ""} globally ${
                            allServersFailed ? "unban" : "unbanned"
                        } ${player.name} (${player.id})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: `${
                                    allServersFailed ? "Tried to g" : "G"
                                }lobally ${
                                    allServersFailed ? "unban" : "unbanned"
                                } ${player.name} (${outputPlayerIDs(
                                    player.ids,
                                    true
                                )})\n\n`,
                                ...(failedServers.length && {
                                    fields: [
                                        {
                                            name: "Failed servers",
                                            value: failedServers
                                                .map(
                                                    (server) =>
                                                        `${server.name} (${server.data.result})`
                                                )
                                                .join("\n"),
                                        },
                                    ],
                                }),
                            },
                        ],
                        components: [],
                    });
                }
            );
        } catch (error) {
            await ctx.send(
                `An error occured while performing the command (${
                    error.message || error
                })`
            );
        }
    }
}
