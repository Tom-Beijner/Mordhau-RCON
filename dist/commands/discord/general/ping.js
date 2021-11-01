"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
class Ping extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Show the bot's ping",
        });
    }
    async run(ctx) {
        await ctx.defer();
        const startedAt = Date.now();
        await ctx.send(":ping_pong: Calculating ping");
        await ctx.editOriginal(`:ping_pong: Pong!\nMessage: \`${Date.now() - startedAt}ms\``);
    }
}
exports.default = Ping;
