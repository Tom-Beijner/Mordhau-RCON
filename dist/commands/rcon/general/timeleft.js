"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
class Timeleft extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "timeleft",
        });
    }
    async execute(ctx) {
        const leftMatchDuration = await ctx.rcon.getLeftMatchDuration();
        await ctx.say(`Match ends ${date_fns_1.formatDistanceToNow(date_fns_1.addSeconds(new Date(), leftMatchDuration), { addSuffix: true })}`);
    }
}
exports.default = Timeleft;
