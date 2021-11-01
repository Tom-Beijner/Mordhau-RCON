"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class VoteMap extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "votemap [map number]",
        });
    }
    async execute(ctx) {
        ctx.rcon.mapVote.vote(parseInt(ctx.args[0]), ctx.player);
    }
}
exports.default = VoteMap;
