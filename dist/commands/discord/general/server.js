"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
class Server extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get information about the server",
        });
    }
    async run(ctx) {
        await ctx.defer();
        try {
            const servers = await this.bot.rcon.getServersInfo();
            const fields = [];
            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];
                fields.push({
                    name: server.server,
                    value: [
                        `• Name: ${server.data.name || "N/A"}`,
                        `• Version/Patch: ${server.data.version || "N/A"}`,
                        `• Match Duration: ${!server.data.name
                            ? "N/A"
                            : `There are ${server.data.leftMatchDuration} seconds remaining.`}`,
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
        }
        catch (error) {
            await ctx.send(`An error occured while performing the command (${error.message || error})`);
        }
    }
}
exports.default = Server;
