"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const slash_create_1 = require("slash-create");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const TeleportConfig_1 = __importDefault(require("../../../structures/TeleportConfig"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class TeleportAdd extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Add teleport location",
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
            defaultPermission: false,
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            map: ctx.options.map.toLowerCase().trim(),
            name: ctx.options.name.toLowerCase().trim(),
            aliases: (ctx.options.aliases || "").length
                ? ctx.options.aliases
                    .split("|")
                    .map((alias) => alias.toLowerCase().trim())
                : [],
            coordinates: {
                x: ctx.options.x,
                y: ctx.options.y,
                z: ctx.options.z,
            },
        };
        const location = `maps.${options.map}.locations.${options.name}`;
        try {
            if (TeleportConfig_1.default.has(location))
                return "Location already exist";
            if (Object.entries(TeleportConfig_1.default.get(`maps.${options.map}.locations`, {})).some((location) => {
                const locationName = location[0];
                const locationData = location[1];
                return options.aliases.some((alias) => {
                    var _a, _b;
                    return locationName.toLowerCase() === alias ||
                        ((_a = locationData === null || locationData === void 0 ? void 0 : locationData.aliases) === null || _a === void 0 ? void 0 : _a.includes(alias)) ||
                        ((_b = locationData === null || locationData === void 0 ? void 0 : locationData.aliases) === null || _b === void 0 ? void 0 : _b.includes(options.name));
                });
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
            TeleportConfig_1.default.set(location, {
                ...(options.aliases.length && { aliases: options.aliases }),
                coordinates: options.coordinates,
            });
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} created a teleport location (Name: ${options.name}${options.aliases && options.aliases.length
                ? `, Aliases: ${options.aliases.join(", ")}`
                : ""}, Coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.y})`);
            await ctx.send({
                embeds: [
                    {
                        description: [
                            `Added the location \`${options.name}\` for \`${options.map}\`\n`,
                            `Coordinates: X=${options.coordinates.x}, Y=${options.coordinates.y}, Z=${options.coordinates.z}`,
                            `Aliases: ${options.aliases.length
                                ? options.aliases.join(", ")
                                : "None added"}`,
                        ].join("\n"),
                    },
                ],
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = TeleportAdd;
