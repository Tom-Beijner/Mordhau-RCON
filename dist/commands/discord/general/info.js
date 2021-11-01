"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pluralize_1 = __importDefault(require("pluralize"));
const DiscordEmbed_1 = __importDefault(require("../../../structures/DiscordEmbed"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
class Info extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Show information about the bot",
        });
    }
    async run(ctx) {
        await ctx.defer();
        {
            const servers = [];
            for (const [serverName, server] of this.bot.servers) {
                servers.push(server.rcon.connected && server.rcon.authenticated);
            }
            const embed = new DiscordEmbed_1.default();
            embed
                .setTitle("Information")
                .setDescription("This bot is open source, available on [GitHub](https://github.com/Tom-Beijner/Mordhau-RCON)")
                .addField("Versions", [
                `Bot: [v${process.env.npm_package_version}](https://github.com/Tom-Beijner/Mordhau-RCON/releases/tag/${process.env.npm_package_version})`,
                `Node.JS: [${process.version}](https://nodejs.org/en/)`,
            ].join("\n"), true)
                .addField("Servers", [
                `Total: ${servers.length}`,
                `↳ Connected: ${pluralize_1.default("server", servers.filter((server) => server).length, true)}`,
                `↳ Disconnected: ${pluralize_1.default("server", servers.filter((server) => !server).length, true)}`,
            ].join("\n"), true);
            return { embeds: [embed.getEmbed()] };
        }
    }
}
exports.default = Info;
