import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class Players extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog) {
        super(creator, bot, {
            name: "players",
            description: "Get ingame players",
        });
    }

    async run(ctx: CommandContext) {
        const players = await this.bot.rcon.getIngamePlayers();
        const playersData = this.bot.cachedPlayers;

        const fields: { name: string; value: string }[] = [];

        for (let i = 0; i < players.length; i++) {
            const server = players[i];

            let message = server.players
                .map(
                    (player, i) =>
                        `${i + 1}. ${player.name} (${outputPlayerIDs(
                            {
                                playFabID: player.id,
                                steamID: playersData.get(player.id)?.ids
                                    ?.steamID,
                            },
                            true
                        )})`
                )
                .join("\n");

            if (!message.length)
                message = "No one players online, what a sad gamer moment.";
            if (message.length > 1023)
                message = `The output was too long, but was uploaded to [hastebin](${await hastebin(
                    message
                )})`;

            fields.push({
                name: server.server,
                value: message,
            });
        }

        await ctx.send({
            embeds: [
                {
                    description: `**Current players (${players.reduce(
                        (a, b) => a + b.players.length,
                        0
                    )}):**`,
                    fields,
                },
            ],
        });
    }
}
