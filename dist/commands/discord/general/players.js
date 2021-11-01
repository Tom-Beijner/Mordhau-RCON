"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const utils_1 = require("../../../utils");
const PlayerID_1 = require("../../../utils/PlayerID");
class Players extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Get ingame players",
        });
    }
    async run(ctx) {
        await ctx.defer();
        const fields = [];
        const servers = [...this.bot.servers.values()];
        let playerCount = 0;
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            if (!server.rcon.connected || !server.rcon.authenticated) {
                fields.push({
                    name: server.name,
                    value: `Not ${!server.rcon.connected ? "connected" : "authenticated"} to server`,
                });
                continue;
            }
            const players = await server.rcon.getIngamePlayers();
            playerCount += players.length;
            let message = players
                .map((player, i) => {
                var _a, _b;
                return `${i + 1}. ${player.name} (${PlayerID_1.outputPlayerIDs({
                    playFabID: player.id,
                    steamID: (_b = (_a = this.bot.cachedPlayers.get(player.id)) === null || _a === void 0 ? void 0 : _a.ids) === null || _b === void 0 ? void 0 : _b.steamID,
                }, true)})`;
            })
                .join("\n");
            if (!message.length)
                message = "No players online, what a sad gamer moment.";
            if (message.length > 1023)
                message = `The output was too long, but was uploaded to [paste.gg](${await utils_1.hastebin(players
                    .map((player, i) => {
                    var _a, _b;
                    return `${i + 1}. ${player.name} (${PlayerID_1.outputPlayerIDs({
                        playFabID: player.id,
                        steamID: (_b = (_a = this.bot.cachedPlayers.get(player.id)) === null || _a === void 0 ? void 0 : _a.ids) === null || _b === void 0 ? void 0 : _b.steamID,
                    })})`;
                })
                    .join("\n"))})`;
            fields.push({
                name: `${server.name} (${players.length})`,
                value: message,
            });
        }
        await ctx.send({
            embeds: [
                {
                    description: `**Current players (${playerCount}):**`,
                    fields,
                },
            ],
        });
    }
}
exports.default = Players;
