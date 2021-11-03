import { exec } from "child_process";
import pluralize from "pluralize";
import { CommandContext, SlashCreator } from "slash-create";
import { promisify } from "util";
import DiscordEmbed from "../../../structures/DiscordEmbed";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";

const execPromise = promisify(exec);

export default class Info extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Show information about the bot",
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        {
            const servers: boolean[] = [];

            for (const [serverName, server] of this.bot.servers) {
                servers.push(
                    server.rcon.connected && server.rcon.authenticated
                );
            }

            let gitCommit: string;
            try {
                gitCommit = (
                    (await execPromise("git rev-parse HEAD")).stdout as string
                ).trim();
            } catch {}

            const embed = new DiscordEmbed();

            embed
                .setTitle("Information")
                .setDescription(
                    "This bot is open source, available on [GitHub](https://github.com/Tom-Beijner/Mordhau-RCON)\n\nMade by [Tom Beijner AKA Schweppes](https://tombeijner.com/)"
                )
                .addField(
                    "Versions",
                    [
                        `Bot: [v${
                            process.env.npm_package_version
                        }](https://github.com/Tom-Beijner/Mordhau-RCON/releases/tag/${
                            process.env.npm_package_version
                        }) (${
                            gitCommit
                                ? `[${gitCommit.substring(
                                      0,
                                      7
                                  )}](https://github.com/Tom-Beijner/Mordhau-RCON/commit/${gitCommit})`
                                : "Unknown"
                        })`,
                        `Node.JS: [${process.version}](https://nodejs.org/en/)`,
                    ].join("\n"),
                    true
                )
                .addField(
                    "Servers",
                    [
                        `Total: ${servers.length}`,
                        `↳ Connected: ${pluralize(
                            "server",
                            servers.filter((server) => server).length,
                            true
                        )}`,
                        `↳ Disconnected: ${pluralize(
                            "server",
                            servers.filter((server) => !server).length,
                            true
                        )}`,
                    ].join("\n"),
                    true
                );

            return { embeds: [embed.getEmbed()] };
        }
    }
}
