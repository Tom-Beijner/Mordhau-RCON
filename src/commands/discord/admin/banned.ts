import pluralize from "pluralize";
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

export default class Banned extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "banned",
            description: "Check if a player is banned and the duration",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
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
        try {
            const id = ctx.options.player as string;
            const servers = await this.bot.rcon.getBannedPlayer(id);
            const fields: { name: string; value: string }[] = [];

            const player =
                this.bot.cachedPlayers.get(id) || (await LookupPlayer(id));

            // if (!servers.length) {
            //     return { content: "Player not banned" };
            // }

            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];

                fields.push({
                    name: server.server,
                    value: !server.data
                        ? "Player not banned"
                        : `Duration: ${
                              server.data.duration === "0"
                                  ? "Permanent"
                                  : pluralize(
                                        "minute",
                                        Number(server.data.duration),
                                        true
                                    )
                          }`,
                });
            }

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `**Banned Player:**`,
                            `Name: ${player.name}`,
                            `PlayFabID: ${player.ids.playFabID}`,
                            `SteamID: ${player.ids.steamID}`,
                        ].join("\n"),
                        fields,
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
