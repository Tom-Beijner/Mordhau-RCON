"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseRCONCommands_1 = __importDefault(require("../../../structures/BaseRCONCommands"));
const TeleportConfig_1 = __importDefault(require("../../../structures/TeleportConfig"));
class Teleport extends BaseRCONCommands_1.default {
    constructor(bot, commandName) {
        super(bot, {
            name: commandName,
            usage: "teleport [player name/id] ([x] [y] [z]/[location])",
            aliases: ["tp"],
        });
    }
    async execute(ctx) {
        if (!ctx.args.length) {
            const locations = TeleportConfig_1.default.get(`maps.${ctx.rcon.currentMap}.locations`, {});
            const locationsMessage = "Locations: " +
                Object.keys(locations)
                    .map((name) => name)
                    .join(", ");
            return await ctx.say(locationsMessage.length
                ? locationsMessage
                : "No teleport locations for this has been added");
        }
        const searchQuery = ctx.args.length > 1 ? ctx.args[1] : ctx.args.join(" ");
        const location = Object.entries(TeleportConfig_1.default.get(`maps.${ctx.rcon.currentMap}.locations`, {})).find(([name, location]) => {
            if (name.toLowerCase() === searchQuery)
                return true;
            else if (location.aliases &&
                location.aliases
                    .map((a) => a.toLowerCase())
                    .includes(searchQuery))
                return true;
        });
        let name = ctx.args.join(" ");
        if (location)
            name = name.replace(new RegExp(` ${location[0]}$`), "");
        let player;
        if (ctx.args.length > 1) {
            player = await ctx.rcon.getIngamePlayer(name);
        }
        if (location) {
            if (ctx.args.length > 1 && !player)
                return await ctx.say("Player not found");
            else if (player &&
                player.id !== ctx.player.id &&
                !ctx.rcon.admins.has(ctx.player.id)) {
                return await ctx.say("You don't have permission to teleport other players");
            }
            return await ctx.rcon.teleportPlayer(ctx.args.length === 2 && ctx.rcon.admins.has(ctx.player.id)
                ? player === null || player === void 0 ? void 0 : player.id
                : ctx.player.id, location[1].coordinates);
        }
        let x = ctx.args[ctx.args.length - 3];
        if (!x)
            return;
        x = parseInt(x);
        if (isNaN(x))
            return;
        let y = ctx.args[ctx.args.length - 2];
        if (!y)
            return;
        y = parseInt(y);
        if (isNaN(y))
            return;
        let z = ctx.args[ctx.args.length - 1];
        if (!z)
            return;
        z = parseInt(z);
        if (isNaN(z))
            return;
        if (player &&
            player.id !== ctx.player.id &&
            !ctx.rcon.admins.has(ctx.player.id)) {
            return await ctx.say("You don't have permission to teleport other players");
        }
        await ctx.rcon.teleportPlayer((player === null || player === void 0 ? void 0 : player.id) || ctx.player.id, { x, y, z });
    }
}
exports.default = Teleport;
