import { CommandContext, CommandOptionType, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import TeleportConfig, {
    Coordinates,
} from "../../../structures/TeleportConfig";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";
import logger from "../../../utils/logger";

export default class TeleportLocations extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get a list of teleport locations",
            options: [
                {
                    name: "map",
                    description: "Get locations of a map (example: moshpit)",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();

        const options = {
            map: (ctx.options.map as string).toLowerCase(),
        };

        const locations: {
            [name: string]: {
                aliases: string[];
                coordinates: Coordinates;
            };
        } = TeleportConfig.get(`maps.${options.map}.locations`);

        try {
            const locationsMessage =
                `Map: \`${options.map}\`\n\n` +
                Object.entries(locations)
                    .map(
                        ([name, location], index) =>
                            `${index + 1}.\nName: ${name}${
                                location.aliases && location.aliases.length
                                    ? `\nAliases: ${location.aliases.join(
                                          ", "
                                      )}`
                                    : ""
                            }\nCoordinates: X=${location.coordinates.x}, Y=${
                                location.coordinates.y
                            }, Z=${location.coordinates.y}`
                    )
                    .join("\n\n");

            logger.info(
                "Command",
                `${ctx.member.displayName}#${ctx.member.user.discriminator} ran get teleport locations (Map: ${options.map})`
            );

            await ctx.send({
                embeds: [
                    {
                        description:
                            locationsMessage.length > 900
                                ? `The output was too long, but was uploaded to [hastebin](${await hastebin(
                                      locationsMessage
                                  )})`
                                : locationsMessage,
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
