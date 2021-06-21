import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";

export default class Server extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "server",
            description: "Get information about the server",
        });
    }

    async run(ctx: CommandContext) {
        try {
            const servers = await this.bot.rcon.getServersInfo();
            const fields: { name: string; value: string }[] = [];

            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];

                fields.push({
                    name: server.server,
                    value: [
                        `• Name: ${server.data.name || "N/A"}`,
                        `• Version/Patch: ${server.data.version || "N/A"}`,
                        `• Match Duration: ${
                            !server.data.name
                                ? "N/A"
                                : `There are ${server.data.leftMatchDuration} seconds remaining.`
                        }`,
                        `• Game Mode: ${server.data.gamemode || "N/A"}`,
                        `• Map: ${server.data.currentMap || "N/A"}`,
                    ].join("\n"),
                });
            }

            await ctx.send({
                embeds: [
                    {
                        description: `**Servers Info:**`,
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
