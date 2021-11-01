"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Discord_1 = require("../../../services/Discord");
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
const PlayerID_1 = require("../../../utils/PlayerID");
const RemoveMentions_1 = __importDefault(require("../../../utils/RemoveMentions"));
class RequestAdmin extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "requestadmins",
            aliases: ["requestadmins", "reqadmins", "reqadmin", "admincall"],
        });
    }
    async execute(ctx) {
        const player = ctx.bot.cachedPlayers.get(ctx.player.id) || {
            server: ctx.rcon.options.name,
            ...(await ctx.rcon.getPlayerToCache(ctx.player.id)),
        };
        Discord_1.sendWebhookMessage(ctx.rcon.webhooks.get("adminCalls"), `${RemoveMentions_1.default(player.name)} (${PlayerID_1.outputPlayerIDs(player.ids, true)}) requested admins${ctx.args.length
            ? ` with the message \`${ctx.args.join(" ")}\``
            : ""} (Server: ${player.server})`);
        await ctx.say("Requested admins");
    }
}
exports.default = RequestAdmin;
