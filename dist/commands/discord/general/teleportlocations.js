"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const TeleportConfig_1 = __importDefault(require("../../../structures/TeleportConfig"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class TeleportLocations extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get a list of teleport locations",
            options: [
                {
                    name: "map",
                    description: "Get locations of a map (example: moshpit)",
                    required: true,
                    type: slash_create_1.CommandOptionType.STRING,
                },
            ],
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            map: ctx.options.map.toLowerCase(),
        };
        const locations = TeleportConfig_1.default.get(`maps.${options.map}.locations`);
        if (!locations) {
            let message;
            const maps = TeleportConfig_1.default.get("maps");
            if (!maps)
                message = "No maps with teleport locations found";
            else {
                message =
                    "Maps: " +
                        Object.keys(maps)
                            .map((map) => map)
                            .join(", ");
            }
            return message;
        }
        try {
            const locationsMessage = `Map: \`${options.map}\`\n\n` +
                Object.entries(locations)
                    .map(([name, location], index) => `${index + 1}.\nName: ${name}${location.aliases && location.aliases.length
                    ? `\nAliases: ${location.aliases.join(", ")}`
                    : ""}\nCoordinates: X=${location.coordinates.x}, Y=${location.coordinates.y}, Z=${location.coordinates.z}`)
                    .join("\n\n");
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} ran get teleport locations (Map: ${options.map})`);
            let attachment;
            if (locationsMessage.length > 900) {
                attachment = Buffer.from(locationsMessage);
            }
            await ctx.send({
                embeds: [
                    {
                        description: locationsMessage.length > 900
                            ? "See attached text file"
                            : locationsMessage,
                    },
                ],
                ...(locationsMessage.length > 900 && {
                    file: {
                        file: attachment,
                        name: "Output.txt"
                    }
                })
            });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = TeleportLocations;
