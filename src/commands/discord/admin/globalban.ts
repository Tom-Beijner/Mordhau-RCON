import flatMap from "array.prototype.flatmap";
import BigNumber from "bignumber.js";
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
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class GlobalBan extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Globally ban a player",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "duration",
                    description: "Duration of the ban in minutes",
                    required: true,
                    type: CommandOptionType.INTEGER,
                },
                {
                    name: "reason",
                    description: "Reason of the ban",
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
            player: ctx.options.player as string,
            duration: new BigNumber(ctx.options.duration as number),
            reason: ctx.options.reason as string | null,
        };

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(
            ctx.options.player as string
        );
        const player =
            this.bot.cachedPlayers.get(ingamePlayer?.id || options.player) ||
            (await LookupPlayer(ingamePlayer?.id || options.player));
        const duration = options.duration;
        const reason = options.reason;

        if (!player?.id) {
            return await ctx.send("Invalid player provided");
        }

        try {
            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: [
                                `Are you sure you want to globally ban ${
                                    player.name
                                } (${outputPlayerIDs(player.ids, true)})?\n`,
                                `Duration: ${
                                    duration.isEqualTo(0)
                                        ? "PERMANENT"
                                        : pluralize(
                                              "minute",
                                              duration.toNumber(),
                                              true
                                          )
                                }`,
                                `Reason: ${reason || "None given"}`,
                            ].join("\n"),
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id) return;

                    const result = await this.bot.rcon.globalBan(
                        {
                            ids: { playFabID: ctx.member.id },
                            id: ctx.member.id,
                            name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                        },
                        player,
                        duration,
                        reason
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
                            allServersFailed ? "ban" : "banned"
                        } ${player.name} (${player.id}) (Duration: ${
                            duration.isEqualTo(0)
                                ? "PERMANENT"
                                : pluralize("minute", duration.toNumber(), true)
                        }, Reason: ${reason || "None given"})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `${
                                        allServersFailed ? "Tried to g" : "G"
                                    }lobally ${
                                        allServersFailed ? "ban" : "banned"
                                    } ${player.name} (${outputPlayerIDs(
                                        player.ids,
                                        true
                                    )})\n`,
                                    `Duration: ${
                                        duration.isEqualTo(0)
                                            ? "PERMANENT"
                                            : pluralize(
                                                  "minute",
                                                  duration.toNumber(),
                                                  true
                                              )
                                    }`,
                                    `Reason: ${reason || "None given"}\n`,
                                ].join("\n"),
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
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
