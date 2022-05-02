import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import { ComponentConfirmation } from "../../../services/Discord";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import TeleportConfig, { Location } from "../../../structures/TeleportConfig";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";

export default class TeleportRemove extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Remove teleport location",
            options: [
                {
                    name: "map",
                    description: "Map the location is in (example: moshpit)",
                    required: true,
                    type: CommandOptionType.STRING,
                    choices: Object.keys(TeleportConfig.get("maps")).map(
                        (name) => ({
                            name: name,
                            value: name,
                        })
                    ),
                },
                {
                    name: "name",
                    description: "Name of the location",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
            // permissions: Object.assign(
            //     {},
            //     ...bot.client.guilds.map((guild) => ({
            //         [guild.id]: flatMap(
            //             (config.get("discord.roles") as Role[]).filter((role) =>
            //                 role.commands.includes(commandName)
            //             ),
            //             (role) =>
            //                 role.Ids.map((id) => ({
            //                     type: ApplicationCommandPermissionType.ROLE,
            //                     id,
            //                     permission: true,
            //                 }))
            //         ),
            //     }))
            // ),
        });
    }

    hasPermission(ctx: CommandContext): string | boolean {
        // const permissions = Object.assign(
        //     {},
        //     ...this.bot.client.guilds.map((guild) => ({
        //         [guild.id]: flatMap(
        //             (config.get("discord.roles") as Role[]).filter((role) =>
        //                 role.commands.includes(this.commandName)
        //             ),
        //             (role) =>
        //                 role.Ids.map((id) => ({
        //                     type: ApplicationCommandPermissionType.ROLE,
        //                     id,
        //                     permission: true,
        //                 }))
        //         ),
        //     }))
        // );

        // return (
        //     permissions[ctx.guildID]?.some((permission) =>
        //         ctx.member.roles.includes(permission.id)
        //     ) ?? false
        // );

        return ctx.member.roles.some((r) =>
            (config.get("discord.roles") as Role[])
                .filter((role) => role.commands.includes(this.commandName))
                .find((role) => role.Ids.includes(r))
        );
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            map: (ctx.options.map as string).toLowerCase().trim(),
            name: (ctx.options.name as string).toLowerCase().trim(),
        };

        try {
            const locationPath = `maps.${options.map}.locations.${options.name}`;
            const location: Location = TeleportConfig.get(locationPath);
            if (!location) return "Location doesn't exist";

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: [
                                `Are you sure you want to delete the teleport location \`${options.name}\` of \`${options.map}\`?\n`,
                                `Coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                `Aliases: ${
                                    location.aliases.length
                                        ? location.aliases.join(", ")
                                        : "None added"
                                }`,
                            ].join("\n"),
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    // @ts-ignore
                    TeleportConfig.delete(locationPath);

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } deleted a teleport location (Name: ${options.name}${
                            location.aliases && location.aliases.length
                                ? `, Aliases: ${location.aliases.join(", ")}`
                                : ""
                        }, Coordinates: X=${location.coordinates.x}, Y=${
                            location.coordinates.y
                        }, Z=${location.coordinates.y})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `Deleted the location \`${options.name}\` for \`${options.map}\`\n`,
                                    `Coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                    `Aliases: ${
                                        location.aliases &&
                                        location.aliases.length
                                            ? location.aliases.join(", ")
                                            : "None added"
                                    }\n`,
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
