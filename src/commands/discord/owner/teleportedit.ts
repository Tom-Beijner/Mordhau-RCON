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

export default class TeleportEdit extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Edit teleport location",
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
            defaultPermission: false,
            permissions: {
                [config.get("discord.guildId") as string]: flatMap(
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
            },
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            map: (ctx.options.map as string).toLowerCase().trim(),
            name: (ctx.options.name as string).toLowerCase().trim(),
            aliases: ((ctx.options.aliases as string) || "").length
                ? (ctx.options.aliases as string)
                      .split("|")
                      .map((alias) => alias.trim())
                : [],
            coordinates: {
                x: ctx.options.x as number,
                y: ctx.options.y as number,
                z: ctx.options.z as number,
            },
        };

        try {
            const locationPath = `maps.${options.map}.locations.${options.name}`;
            const location: Location = TeleportConfig.get(locationPath);

            if (!location) return "Location doesn't exist";
            if (
                Object.entries<Location>(
                    TeleportConfig.get(`maps.${options.map}.locations`, {})
                ).some(([name, location]) =>
                    location?.aliases?.some(
                        (alias) =>
                            name !== options.name &&
                            (location.aliases.includes(alias) ||
                                location.aliases.includes(options.name))
                    )
                )
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

            ComponentConfirmation(
                ctx,
                {
                    embeds: [
                        {
                            description: [
                                `Are you sure you want to edit the teleport location \`${options.name}\` of \`${options.map}\`?\n`,
                                `Current coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                `Current aliases: ${
                                    location.aliases && location.aliases.length
                                        ? location.aliases.join(", ")
                                        : "None added"
                                }\n`,
                                `New coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                                `New aliases: ${
                                    options.aliases.length
                                        ? options.aliases.join(", ")
                                        : "None added"
                                }`,
                            ].join("\n"),
                            color: 15158332,
                        },
                    ],
                },
                async (btnCtx) => {
                    TeleportConfig.set(locationPath, {
                        ...(options.aliases.length && {
                            aliases: options.aliases,
                        }),
                        coordinates: options.coordinates,
                    });

                    logger.info(
                        "Command",
                        `${ctx.member.displayName}#${
                            ctx.member.user.discriminator
                        } edited a teleport location (Name: ${options.name}${
                            options.aliases.length
                                ? `, Aliases: ${options.aliases.join(", ")}`
                                : ""
                        }, Coordinates: X=${options.coordinates.x}, Y=${
                            options.coordinates.y
                        }, Z=${options.coordinates.y})`
                    );

                    await btnCtx.editParent({
                        embeds: [
                            {
                                description: [
                                    `Edited the location \`${options.name}\` for \`${options.map}\`\n`,
                                    `Old coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                    `Old aliases: ${
                                        location.aliases &&
                                        location.aliases.length
                                            ? location.aliases.join(", ")
                                            : "None added"
                                    }\n`,
                                    `New coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                                    `New aliases: ${
                                        options.aliases &&
                                        options.aliases.length
                                            ? options.aliases.join(", ")
                                            : "None added"
                                    }`,
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
