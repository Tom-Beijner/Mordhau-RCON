"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const Discord_1 = require("../../../services/Discord");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const TeleportConfig_1 = __importDefault(require("../../../structures/TeleportConfig"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class TeleportEdit extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Edit teleport location",
            options: [
                {
                    name: "map",
                    description: "Map the location is in (example: moshpit)",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
                {
                    name: "name",
                    description: "Name of the location",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
                {
                    name: "x",
                    description: "X coordinate",
                    required: true,
                    type: slash_create_1.CommandOptionType.NUMBER,
                },
                {
                    name: "y",
                    description: "Y coordinate",
                    required: true,
                    type: slash_create_1.CommandOptionType.NUMBER,
                },
                {
                    name: "z",
                    description: "Z coordinate",
                    required: true,
                    type: slash_create_1.CommandOptionType.NUMBER,
                },
                {
                    name: "aliases",
                    description: "Aliases for the command, separate them with |",
                    required: false,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
            dmPermission: false,
            guildIDs: bot.client.guilds.map((guild) => guild.id),
            requiredPermissions: [],
        });
    }
    hasPermission(ctx) {
        return ctx.member.roles.some((r) => Config_1.default.get("discord.roles")
            .filter((role) => role.commands.includes(this.commandName))
            .find((role) => role.Ids.includes(r)));
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            map: ctx.options.map.toLowerCase().trim(),
            name: ctx.options.name.toLowerCase().trim(),
            aliases: (ctx.options.aliases || "").length
                ? ctx.options.aliases
                    .split("|")
                    .map((alias) => alias.trim())
                : [],
            coordinates: {
                x: ctx.options.x,
                y: ctx.options.y,
                z: ctx.options.z,
            },
        };
        try {
            const locationPath = `maps.${options.map}.locations.${options.name}`;
            const location = TeleportConfig_1.default.get(locationPath);
            if (!location)
                return "Location doesn't exist";
            if (Object.entries(TeleportConfig_1.default.get(`maps.${options.map}.locations`, {})).some(([name, location]) => {
                var _a;
                return (_a = location === null || location === void 0 ? void 0 : location.aliases) === null || _a === void 0 ? void 0 : _a.some((alias) => name !== options.name &&
                    (location.aliases.includes(alias) ||
                        location.aliases.includes(options.name)));
            }))
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
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: [
                            `Are you sure you want to edit the teleport location \`${options.name}\` of \`${options.map}\`?\n`,
                            `Current coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                            `Current aliases: ${location.aliases && location.aliases.length
                                ? location.aliases.join(", ")
                                : "None added"}\n`,
                            `New coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                            `New aliases: ${options.aliases.length
                                ? options.aliases.join(", ")
                                : "None added"}`,
                        ].join("\n"),
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                TeleportConfig_1.default.set(locationPath, {
                    ...(options.aliases.length && {
                        aliases: options.aliases,
                    }),
                    coordinates: options.coordinates,
                });
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} edited a teleport location (Name: ${options.name}${options.aliases.length
                    ? `, Aliases: ${options.aliases.join(", ")}`
                    : ""}, Coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.y})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: [
                                `Edited the location \`${options.name}\` for \`${options.map}\`\n`,
                                `Old coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                `Old aliases: ${location.aliases &&
                                    location.aliases.length
                                    ? location.aliases.join(", ")
                                    : "None added"}\n`,
                                `New coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                                `New aliases: ${options.aliases &&
                                    options.aliases.length
                                    ? options.aliases.join(", ")
                                    : "None added"}`,
                            ].join("\n"),
                        },
                    ],
                    components: [],
                });
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = TeleportEdit;
