import { CommandContext, SlashCreator } from "slash-create";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { hastebin } from "../../../utils";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class Players extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get ingame players",
        });
    }

    async run(ctx: CommandContext) {
        // const players = await this.bot.rcon.getIngamePlayers();
        // const playersData = this.bot.cachedPlayers;

        const fields: { name: string; value: string }[] = [];

        // for (let i = 0; i < players.length; i++) {
        //     const server = players[i];

        //     let message = server.players
        //         .map(
        //             (player, i) =>
        //                 `${i + 1}. ${player.name} (${outputPlayerIDs(
        //                     {
        //                         playFabID: player.id,
        //                         steamID: playersData.get(player.id)?.ids
        //                             ?.steamID,
        //                     },
        //                     true
        //                 )})`
        //         )
        //         .join("\n");

        //     if (!message.length)
        //         message = "No one players online, what a sad gamer moment.";
        //     if (message.length > 1023)
        //         message = `The output was too long, but was uploaded to [hastebin](${await hastebin(
        //             message
        //         )})`;

        //     fields.push({
        //         name: server.server,
        //         value: message,
        //     });
        // }

        const servers = [...this.bot.servers.values()];
        let playerCount = 0;

        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];

            if (!server.rcon.connected || !server.rcon.authenticated) {
                fields.push({
                    name: server.name,
                    value: `Not ${
                        !server.rcon.connected ? "connected" : "authenticated"
                    } to server`,
                });
                continue;
            }

            const players = await server.rcon.getIngamePlayers();

            playerCount += players.length;

            let message = players
                .map(
                    (player, i) =>
                        `${i + 1}. ${player.name} (${outputPlayerIDs(
                            {
                                playFabID: player.id,
                                steamID: this.bot.cachedPlayers.get(player.id)
                                    ?.ids?.steamID,
                            },
                            true
                        )})`
                )
                .join("\n");

            if (!message.length)
                message = "No one players online, what a sad gamer moment.";
            if (message.length > 1023)
                message = `The output was too long, but was uploaded to [hastebin](${await hastebin(
                    players
                        .map(
                            (player, i) =>
                                `${i + 1}. ${player.name} (${outputPlayerIDs({
                                    playFabID: player.id,
                                    steamID: this.bot.cachedPlayers.get(
                                        player.id
                                    )?.ids?.steamID,
                                })})`
                        )
                        .join("\n")
                )})`;

            fields.push({
                name: server.name,
                value: message,
            });
        }

        await ctx.send({
            embeds: [
                {
                    description: `**Current players (${playerCount}):**`,
                    fields,
                },
            ],
        });
    }
}
