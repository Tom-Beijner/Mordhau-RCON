import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import TeleportConfig, { Location } from "../../../structures/TeleportConfig";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";

export default class TeleportAdd extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Add teleport location",
            options: [
                {
                    name: "map",
                    description: "Map the location is in (example: moshpit)",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "name",
                    description: "Name of the location",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    name: "x",
                    description: "X coordinate",
                    required: true,
                    type: CommandOptionType.NUMBER,
                },
                {
                    name: "y",
                    description: "Y coordinate",
                    required: true,
                    type: CommandOptionType.NUMBER,
                },
                {
                    name: "z",
                    description: "Z coordinate",
                    required: true,
                    type: CommandOptionType.NUMBER,
                },
                {
                    name: "aliases",
                    description:
                        "Aliases for the command, separate them with |",
                    required: false,
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
            aliases: ((ctx.options.aliases as string) || "").length
                ? (ctx.options.aliases as string)
                      .split("|")
                      .map((alias) => alias.toLowerCase().trim())
                : [],
            coordinates: {
                x: ctx.options.x as number,
                y: ctx.options.y as number,
                z: ctx.options.z as number,
            },
        };

        const location = `maps.${options.map}.locations.${options.name}`;

        try {
            if (TeleportConfig.has(location)) return "Location already exist";
            if (
                Object.entries<Location>(
                    TeleportConfig.get(`maps.${options.map}.locations`, {})
                ).some((location) => {
                    const locationName = location[0];
                    const locationData = location[1];

                    return options.aliases.some(
                        (alias) =>
                            locationName.toLowerCase() === alias ||
                            locationData?.aliases?.includes(alias) ||
                            locationData?.aliases?.includes(options.name)
                    );
                })
            )
                return "A location is already using the name or alias";

            if (options.coordinates.x > Number.MAX_VALUE)
                return "X coordinate is too large";
            if (options.coordinates.x < Number.MIN_SAFE_INTEGER)
                return "X coordinate is too low";
            if (options.coordinates.y > Number.MAX_VALUE)
                return "Y coordinate is too large";
            if (options.coordinates.y < Number.MIN_SAFE_INTEGER)
                return "Y coordinate is too low";
            if (options.coordinates.z > Number.MAX_VALUE)
                return "Z coordinate is too large";
            if (options.coordinates.z < Number.MIN_SAFE_INTEGER)
                return "Z coordinate is too low";

            TeleportConfig.set(location, {
                ...(options.aliases.length && { aliases: options.aliases }),
                coordinates: options.coordinates,
            });

            logger.info(
                "Command",
                `${ctx.member.displayName}#${
                    ctx.member.user.discriminator
                } created a teleport location (Name: ${options.name}${
                    options.aliases && options.aliases.length
                        ? `, Aliases: ${options.aliases.join(", ")}`
                        : ""
                }, Coordinates: X=${options.coordinates.x}, Y=${
                    options.coordinates.y
                }, Z=${options.coordinates.y})`
            );

            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Added the location \`${options.name}\` for \`${options.map}\`\n`,
                            `Coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                            `Aliases: ${
                                options.aliases.length
                                    ? options.aliases.join(", ")
                                    : "None added"
                            }`,
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
