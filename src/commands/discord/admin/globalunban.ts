import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import { LookupPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";

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
            player: ctx.options.player as string,
        };

        const player =
            this.bot.cachedPlayers.get(options.player) ||
            (await LookupPlayer(options.player));

        if (!player?.id) {
            return await ctx.send(`Invalid player provided`);
        }

        try {
            const failedServers: { name: string; reason: string }[] = [];
            const servers = [...this.bot.servers.values()];

            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];
                let error = "";

                if (!server.rcon.connected || !server.rcon.authenticated) {
                    error = `Not ${
                        !server.rcon.connected ? "connected" : "authenticated"
                    } to RCON`;
                }

                error = await server.rcon.unbanUser(
                    server.name,
                    {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    },
                    player
                );

                if (error) {
                    failedServers.push({ name: server.name, reason: error });
                }
            }

            logger.info(
                "Command",
                `${ctx.member.displayName}#${ctx.member.user.discriminator} globally unbanned ${player.name} (${player.id})`
            );

            await ctx.send({
                embeds: [
                    {
                        description: `Globally unbanned player ${player.name} (${player.id})`,
                        ...(failedServers.length && {
                            fields: [
                                {
                                    name: "Failed servers",
                                    value: failedServers
                                        .map(
                                            (server) =>
                                                `${server.name} (${server.reason})`
                                        )
                                        .join("\n"),
                                },
                            ],
                        }),
                    },
                ],
            });
        } catch (error) {
            await ctx.send(
                `An error occured while performing the command (${
                    error.message || error
                })`
            );
        }
    }
}
