"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
class SlashCommand extends slash_create_1.SlashCommand {
    constructor(creator, bot, opts) {
        super(creator, opts);
        this.bot = bot;
    }
}
exports.default = SlashCommand;
