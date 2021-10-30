import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import TeleportConfig, {
    Coordinates,
    Location,
} from "../../../structures/TeleportConfig";
import Watchdog from "../../../structures/Watchdog";

export default class TeleportWith extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "teleportwith <player name/id> ([x] [y] [z]/[location])",
            aliases: ["tpwith"],
            adminsOnly: true,
        });
    }

    async execute(ctx: RCONCommandContext) {
        if (!ctx.args.length) {
            const locations: {
                [name: string]: {
                    aliases: string[];
                    coordinates: Coordinates;
                };
            } = TeleportConfig.get(`maps.${ctx.rcon.currentMap}.locations`, {});

            const locationsMessage =
                "Locations: " +
                Object.keys(locations)
                    .map((name) => name)
                    .join(", ");

            return await ctx.say(
                locationsMessage.length
                    ? locationsMessage
                    : "No teleport locations for this has been added"
            );
        }

        // Needs to be improved as this limtis the location name to be without spaces
        const searchQuery =
            ctx.args.length > 1 ? ctx.args[1] : ctx.args.join(" ");
        const location = Object.entries<Location>(
            TeleportConfig.get(`maps.${ctx.rcon.currentMap}.locations`, {})
        ).find(([name, location]) => {
            if (name.toLowerCase() === searchQuery) return true;
            else if (
                location.aliases &&
                location.aliases
                    .map((a) => a.toLowerCase())
                    .includes(searchQuery)
            )
                return true;
        });
        let name = ctx.args.join(" ");
        if (location) name = name.replace(new RegExp(` ${location[0]}$`), "");
        let player: {
            id: string;
            name: string;
        };
        if (ctx.args.length > 1) {
            player = await ctx.rcon.getIngamePlayer(name);
        }

        if (!player) {
            return await ctx.say("Player not found");
        }

        if (player.id === ctx.player.id) {
            return await ctx.say("You can't teleport yourself with yourself");
        }

        if (location) {
            ctx.rcon.teleportPlayer(ctx.player.id, location[1].coordinates);
            ctx.rcon.teleportPlayer(player.id, location[1].coordinates);
            return;
        }

        // X coordinate
        let x: string | number = ctx.args[ctx.args.length - 3];
        if (!x) return;
        x = parseInt(x);
        if (isNaN(x)) return;

        // Y coordinate
        let y: string | number = ctx.args[ctx.args.length - 2];
        if (!y) return;
        y = parseInt(y);
        if (isNaN(y)) return;

        // Z coordinate
        let z: string | number = ctx.args[ctx.args.length - 1];
        if (!z) return;
        z = parseInt(z);
        if (isNaN(z)) return;

        ctx.rcon.teleportPlayer(ctx.player.id, { x, y, z });
        ctx.rcon.teleportPlayer(player.id, { x, y, z });
    }
}
