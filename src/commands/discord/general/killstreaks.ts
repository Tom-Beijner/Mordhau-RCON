import pluralize from "pluralize";
import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";

export default class Killstreaks extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get all players killstreaks",
        });
    }

    async run(ctx: CommandContext) {
        const killstreaks = this.bot.rcon.getKillstreaks();
        const onlinePlayers = await this.bot.rcon.getIngamePlayers();
        const players: {
            player: { id: string; name: string };
            kills: number;
        }[] = [];
        const fields: { name: string; value: string }[] = [];

        for (let i = 0; i < killstreaks.length; i++) {
            const server = killstreaks[i];
            for (const [_, data] of server.data) {
                players.push(data);
            }

            let message = players
                .sort((a, b) => b.kills - a.kills)
                .map(
                    (killstreak, index) =>
                        `${index + 1}. ${killstreak.player.name}: ${pluralize(
                            "kill",
                            killstreak.kills,
                            true
                        )}`
                )
                .join("\n");
            if (!message.length)
                message = "No one has any kills, what a sad gamer moment.";
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
                    description: [
                        `**Killstreaks (${killstreaks.reduce(
                            (a, b) => a + b.data.size,
                            0
                        )}/${pluralize(
                            "player",
                            onlinePlayers.reduce(
                                (acc, server) => acc + server.players.length,
                                0
                            ),
                            true
                        )}): **\n`,
                    ].join("\n"),
                    fields,
                },
            ],
        });
    }
}
