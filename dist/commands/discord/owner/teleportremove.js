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
class TeleportRemove extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Remove teleport location",
            options: [
                {
                    name: "map",
                    description: "Map the location is in (example: moshpit)",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                    choices: Object.keys(TeleportConfig_1.default.get("maps")).map((name) => ({
                        name: name,
                        value: name,
                    })),
                },
                {
                    name: "name",
                    description: "Name of the location",
                    required: true,
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
        };
        try {
            const locationPath = `maps.${options.map}.locations.${options.name}`;
            const location = TeleportConfig_1.default.get(locationPath);
            if (!location)
                return "Location doesn't exist";
            Discord_1.ComponentConfirmation(ctx, {
                embeds: [
                    {
                        description: [
                            `Are you sure you want to delete the teleport location \`${options.name}\` of \`${options.map}\`?\n`,
                            `Coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                            `Aliases: ${location.aliases.length
                                ? location.aliases.join(", ")
                                : "None added"}`,
                        ].join("\n"),
                        color: 15158332,
                    },
                ],
            }, async (btnCtx) => {
                TeleportConfig_1.default.delete(locationPath);
                logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} deleted a teleport location (Name: ${options.name}${location.aliases && location.aliases.length
                    ? `, Aliases: ${location.aliases.join(", ")}`
                    : ""}, Coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.y})`);
                await btnCtx.editParent({
                    embeds: [
                        {
                            description: [
                                `Deleted the location \`${options.name}\` for \`${options.map}\`\n`,
                                `Coordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`,
                                `Aliases: ${location.aliases &&
                                    location.aliases.length
                                    ? location.aliases.join(", ")
                                    : "None added"}\n`,
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
exports.default = TeleportRemove;
