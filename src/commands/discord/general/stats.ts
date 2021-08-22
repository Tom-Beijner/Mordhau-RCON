import { CommandContext, SlashCreator } from "slash-create";
import DiscordEmbed from "../../../structures/DiscordEmbed";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { readable } from "../../../utils/Readable";

export default class Stats extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Show statistics about the bot",
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        {
            const embed = new DiscordEmbed();

            embed.setColor(0x000000);
            embed.setTitle("Bot statistics:");

            // embed.addField(
            //     "General",
            //     [
            //         `Guilds: ${this.bot.guilds.size}`,
            //         `Channels: ${Object.keys(this.bot.channelGuildMap).length}`,
            //         `Users: ${this.bot.users.size}`,
            //     ].join("\n"),
            //     true
            // );

            // Gets the current cpu usage
            const cpuUsage = (
                process.cpuUsage().user / process.cpuUsage().system
            ).toFixed(2);

            embed.addField(
                "System",
                [
                    `Memory Usage: RSS: ${(
                        process.memoryUsage().rss /
                        1024 /
                        1000
                    ).toFixed(2)}MB | Heap Used: ${(
                        process.memoryUsage().heapUsed /
                        1024 /
                        1000
                    ).toFixed(2)}MB`,
                    `CPU Usage: ${cpuUsage}%`,
                    `Uptime: ${readable(Date.now() - this.bot.startTime)}`,
                ].join("\n"),
                true
            );

            await ctx.send({ embeds: [embed.getEmbed()] });
        }
    }
}
