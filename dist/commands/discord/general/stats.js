"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DiscordEmbed_1 = __importDefault(require("../../../structures/DiscordEmbed"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const Readable_1 = require("../../../utils/Readable");
class Stats extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Show statistics about the bot",
        });
    }
    async run(ctx) {
        await ctx.defer();
        {
            const embed = new DiscordEmbed_1.default();
            embed.setColor(0x000000);
            embed.setTitle("Bot statistics:");
            const cpuUsage = (process.cpuUsage().user / process.cpuUsage().system).toFixed(2);
            embed.addField("System", [
                `Memory Usage: RSS: ${(process.memoryUsage().rss /
                    1024 /
                    1000).toFixed(2)}MB | Heap Used: ${(process.memoryUsage().heapUsed /
                    1024 /
                    1000).toFixed(2)}MB`,
                `CPU Usage: ${cpuUsage}%`,
                `Uptime: ${Readable_1.readable(Date.now() - this.bot.startTime)}`,
            ].join("\n"), true);
            await ctx.send({ embeds: [embed.getEmbed()] });
        }
    }
}
exports.default = Stats;
