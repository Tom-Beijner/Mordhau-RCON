import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import { ComponentConfirmation } from "../../../services/Discord";
import { LookupPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class AddAdmin extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Add an admin",
            options: [
                {
                    name: "server",
                    description: "Server to run the command on",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: config.servers.map((server) => ({
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
                } to RCON`
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
            if (server.rcon.admins.has(player.id)) {
                return await ctx.send(
                    `${player.name} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}) is already an admin (Server: ${server.name})`
                );
            }

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: `Are you sure you want to add ${
                                player.name
                            } (${outputPlayerIDs(
                                player.ids,
                                true
                            )}) as an admin?`,
                        },
                    ],
                },
                async (btnCtx) => {
                    server.rcon.admins.add(player.id);

                    const result = await server.rcon.addAdmin(player.id);

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${ctx.member.user.discriminator} gave ${player.name} admin privileges (Server: ${server.name})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `Player: ${player.name} (${outputPlayerIDs(
                                        player.ids,
                                        true
                                    )})`,
                                    `Result: ${result}`,
                                    `Server: ${server.name}`,
                                ].join("\n"),
                            },
                        ],
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
