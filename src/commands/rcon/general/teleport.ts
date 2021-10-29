import BaseRCONCommand from "../../../structures/BaseRCONCommands";
import RCONCommandContext from "../../../structures/RCONCommandContext";
import TeleportConfig, {
    Coordinates,
    Location,
} from "../../../structures/TeleportConfig";
import Watchdog from "../../../structures/Watchdog";

export default class Teleport extends BaseRCONCommand {
    constructor(bot: Watchdog, commandName: string) {
        super(bot, {
            name: commandName,
            usage: "teleport [player name/id] ([x] [y] [z])/[location]",
            aliases: ["tp"],
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
        let foundWithName = false;
        const location = Object.entries<Location>(
            TeleportConfig.get(`maps.${ctx.rcon.currentMap}.locations`, {})
        ).find(([name, location]) => {
            if (name.toLowerCase() === searchQuery) {
                foundWithName = true;
                return true;
            } else if (
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

        if (location) {
            if (ctx.args.length > 1 && !player)
                return await ctx.say("Player not found");
            else if (
                player &&
                player.id !== ctx.player.id &&
                !ctx.rcon.admins.has(ctx.player.id)
            ) {
                return await ctx.say(
                    "You don't have permission to teleport other players"
                );
            }

            return await ctx.rcon.teleportPlayer(
                ctx.args.length === 2 && ctx.rcon.admins.has(ctx.player.id)
                    ? player?.id
                    : ctx.player.id,
                location[1].coordinates
            );
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

        if (
            player &&
            player.id !== ctx.player.id &&
            !ctx.rcon.admins.has(ctx.player.id)
        ) {
            return await ctx.say(
                "You don't have permission to teleport other players"
            );
        }

        await ctx.rcon.teleportPlayer(player?.id || ctx.player.id, { x, y, z });
    }
}
