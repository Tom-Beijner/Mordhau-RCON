import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import { LookupPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class GlobalMute extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "globalmute",
            description: "Globally mute a player",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "duration",
                    description: "Duration of the mute in minutes",
                    required: true,
                    type: CommandOptionType.INTEGER,
                },
            ],
            defaultPermission: false,
            permissions: {
                [config.discord.guildId]: [
                    ...config.discord.roles.admins.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.headAdmin.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.owner.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                    ...config.discord.roles.owner.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
                ],
            },
        });
    }

    async run(ctx: CommandContext) {
        const options = {
            player: ctx.options.player as string,
            duration: ctx.options.duration as number,
        };

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(
            ctx.options.player as string
        );
        const player =
            this.bot.cachedPlayers.get(ingamePlayer?.id || options.player) ||
            (await LookupPlayer(ingamePlayer?.id || options.player));
        const duration = options.duration;

        if (!player.id) {
            return await ctx.send(`Invalid player provided`);
        }

        try {
            const failedServers: { name: string; reason: string }[] = [];

            this.bot.servers.forEach(async (server) => {
                if (!server.rcon.connected || !server.rcon.authenticated) {
                    return (await ctx.send(`Not connected to RCON`)) as Message;
                }

                const error = await server.rcon.muteUser(
                    server.name,
                    {
                        ids: { playFabID: ctx.member.id },
                        id: ctx.member.id,
                        name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                    },
                    player,
                    duration
                );

                if (error) {
                    failedServers.push({ name: server.name, reason: error });
                }
            });

            logger.info(
                "Command",
                `${ctx.member.displayName}#${ctx.member.user.discriminator} globally muted ${player.name} (${player.id}) (Duration: ${duration})`
            );

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Globally muted player ${
                                player.name
                            } (${outputPlayerIDs(player.ids, true)})\n`,
                            `Duration: ${duration}`,
                        ].join("\n"),
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
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
