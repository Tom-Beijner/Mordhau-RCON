"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class CancelMapVote extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "cancelmapvote",
            adminsOnly: true,
        });
    }
    async execute(ctx) {
        ctx.rcon.mapVote.cancel();
    }
}
exports.default = CancelMapVote;
