import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import config from "../../../config.json";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";

export default class Rename extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "rename",
            description: "Rename a in game player's name",
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
                    name: "new_name",
                    description: "A new name for the player",
                    required: true,
                    type: CommandOptionType.STRING,
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
        const server = this.bot.servers.get(ctx.options.server as string);
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

        const player = await this.bot.rcon.getIngamePlayer(
            ctx.options.player as string
        );
        if (!player) {
            return (await ctx.send("Player is not in the server")) as Message;
        }

        const newName = ctx.options.new_name;

        try {
            await server.rcon.send(`renameplayer ${player.id} ${newName}`);

            logger.info(
                "Command",
                `${ctx.member.nick || ctx.member.user.username}#${
                    ctx.member.user.discriminator
                } renamed player ${player.name} (${
                    player.id
                }) to ${newName} (Server: ${server.name})`
            );

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Server: ${server.name}`,
                            `Renamed player ${player.name} (${player.id})\n`,
                            `To: ${newName}`,
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
