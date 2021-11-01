"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseRCONCommand {
    constructor(bot, meta) {
        this.meta = {
            name: "",
            usage: "",
            aliases: [],
            adminsOnly: false,
            options: [],
        };
        this.bot = bot;
        this.meta = { ...this.meta, ...meta };
    }
}
exports.default = BaseRCONCommand;
