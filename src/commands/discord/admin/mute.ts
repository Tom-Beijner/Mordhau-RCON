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

export default class Mute extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "mute",
            description: "Mute a player",
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
                    ...config.discord.roles.mods.map((role) => ({
                        type: ApplicationCommandPermissionType.ROLE,
                        id: role,
                        permission: true,
                    })),
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
                ],
            },
        });
    }

    async run(ctx: CommandContext) {
        const options = {
            server: ctx.options.server as string,
            player: ctx.options.player as string,
            duration: ctx.options.duration as number,
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
            return (await ctx.send(`Not connected to RCON`)) as Message;
        }

        const ingamePlayer = await server.rcon.getIngamePlayer(options.player);
        const player = this.bot.cachedPlayers.get(
            ingamePlayer?.id || options.player
        ) || {
            server: server.name,
            ...(await LookupPlayer(ingamePlayer?.id || options.player)),
        };
        const duration = options.duration;

        if (!player.id) {
            return await ctx.send(`Invalid player provided`);
        }

        try {
            const error = await server.rcon.muteUser(
                player.server,
                {
                    ids: { playFabID: ctx.member.id },
                    id: ctx.member.id,
                    name: `${ctx.member.displayName}#${ctx.member.user.discriminator}`,
                },
                player,
                duration
            );

            if (error) {
                return (await ctx.send(error)) as Message;
            }

            logger.info(
                "Command",
                `${ctx.member.displayName}#${ctx.member.user.discriminator} muted ${player.name} (${player.id}) (Duration: ${duration})`
            );

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Muted player ${player.name} (${outputPlayerIDs(
                                player.ids,
                                true
                            )})\n`,
                            `Server: ${server.name}`,
                            `Duration: ${duration}`,
                        ].join("\n"),
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
