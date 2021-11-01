"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
class HighestKillstreak extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get the current highest killstreak",
        });
    }
    async run(ctx) {
        await ctx.defer();
        const servers = this.bot.rcon.getHighestKillstreaks();
        const fields = [];
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            fields.push({
                name: server.server,
                value: !server.data
                    ? "No one has any kills, what a sad gamer moment."
                    : `${server.data.player.name} has the highest killstreak of ${server.data.kills}!`,
            });
        }
        await ctx.send({ embeds: [{ fields }] });
    }
}
exports.default = HighestKillstreak;
