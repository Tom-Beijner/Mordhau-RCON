import flatMap from "array.prototype.flatmap";
import { addMinutes, formatDistanceToNow } from "date-fns";
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
import { hastebin } from "../../../utils/Hastebin";
import logger from "../../../utils/logger";
import { outputPlayerIDs, parsePlayerID } from "../../../utils/PlayerID";

export default class DeleteHistory extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Delete history of a player or an admin",
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
                    description: "PlayFab ID or name of the player",
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

            let pastOffenses: string;
            let totalDuration = 0;

            if (!playerHistory.history.length) pastOffenses = "None";
            else {
                pastOffenses = "------------------";

                for (let i = 0; i < playerHistory.history.length; i++) {
                    const offense: string[] = [];
                    const h = playerHistory.history[i];
                    const type = h.type;
                    const admin = h.admin;
                    const date = new Date(h.date);

                    let historyDuration: string;
                    if (!h.duration) historyDuration = "PERMANENT";
                    else {
                        historyDuration = pluralize("minute", h.duration, true);
                        totalDuration += h.duration;
                    }

                    offense.push(
                        [
                            `\nID: ${i + 1}`,
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

                    pastOffenses += offense.join("\n");
                }

                if (pastOffenses.length < 1025)
                    pastOffenses = `\`\`\`${pastOffenses}\`\`\``;
            }

            if (pastOffenses.length > 1024)
                pastOffenses = `The output was too long, but was uploaded to [paste.gg](${await hastebin(
                    pastOffenses
                )})`;

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: `Are you sure you want to delete \`${
                                options.type
                            }\` history of ${player.name} (${outputPlayerIDs(
                                player.ids,
                                true
                            )})?`,
                            fields: [
                                {
                                    name:
                                        options.type === "player"
                                            ? `Previous Offenses (${playerHistory.history.length})`
                                            : `Punishments Given (${playerHistory.history.length})`,
                                    value: pastOffenses,
                                },
                            ],
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    if (ctx.user.id !== btnCtx.user.id) return;
                    await this.bot.database.deletePlayerHistory(
                        [options.player],
                        options.type === "admin"
                    );

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } deleted ${options.type} history of ${
                            player.name
                        } (${outputPlayerIDs(player.ids, true)})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: `Cleared \`${
                                    options.type
                                }\` punishment of ${
                                    player.name
                                } (${outputPlayerIDs(player.ids, true)})`,
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
