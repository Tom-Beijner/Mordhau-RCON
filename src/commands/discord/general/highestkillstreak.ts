import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";

export default class HighestKillstreak extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "highestkillstreak",
            description: "Get the current highest killstreak",
        });
    }

    async run(ctx: CommandContext) {
        const servers = this.bot.rcon.getHighestKillstreaks();
        const fields: { name: string; value: string }[] = [];

        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];

            fields.push({
                name: server.server,
                value: !server.data
                    ? "No one has any kills, what a sad gamer moment."
                    : `${server.data.player.name} has the highest killstreak of ${server.data.kills}!`,
            });
        }

        await ctx.send({ embeds: [{ fields }] });
    }
}
