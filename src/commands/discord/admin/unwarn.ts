import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
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
import { outputPlayerIDs } from "../../../utils/PlayerID";
import removeMentions from "../../../utils/RemoveMentions";

export default class Unwarn extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Unwarn a player",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.get("servers").map((server) => ({
                        name: server.name,
                        value: server.name,
                    })),
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
            server: ctx.options.server as string,
            player: ctx.options.player as string,
        };

        const server = this.bot.servers.get(options.server);
        if (!server) {
            return (await ctx.send(
                `Server not found, existing servers are: ${[
                    ...this.bot.servers.keys(),
                ].join(", ")}`
            )) as Message;
        }
        if (!server.rcon.connected || !server.rcon.authenticated) {
            return (await ctx.send(
                `Not ${
                    !server.rcon.connected ? "connected" : "authenticated"
                } to server`
            )) as Message;
        }

        const ingamePlayer = await server.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get(
            ingamePlayer?.id || options.player
        ) || {
            server: server.name,
            ...(await LookupPlayer(ingamePlayer?.id || options.player)),
        };

        if (!player?.id) {
            return await ctx.send(`Invalid player provided`);
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
                                `Are you sure you want to unwarn ${
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

                    await this.bot.database.Warns.updateOne(
                        { id: player.id },
                        {
                            $inc: { infractions: -1 },
                        }
                    );

                    sendWebhookMessage(
                        server.rcon.webhooks.get("warns"),
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } (${ctx.member.id}) unwarned ${removeMentions(
                            player.name
                        )} (${outputPlayerIDs(player.ids, true)}) (Warnings: ${
                            playerWarns.infractions - 1
                        })`
                    );

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } unwarned ${player.name} (${player.id}) (Server: ${
                            server.rcon.options.name
                        }, Warnings: ${playerWarns.infractions - 1})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `Unwarned ${player.name} (${outputPlayerIDs(
                                        player.ids
                                    )})\n`,
                                    `Warnings: ${playerWarns.infractions - 1}`,
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
