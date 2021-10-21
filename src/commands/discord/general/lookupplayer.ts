import {
    CommandContext,
    CommandOptionType,
    Message,
    SlashCreator,
} from "slash-create";
import { LookupPlayer as GetPlayer } from "../../../services/PlayFab";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import { outputPlayerIDs } from "../../../utils/PlayerID";

export default class LookupPlayer extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Get player's stats using ID",
            options: [
                {
                    name: "player",
                    description: "PlayFab ID or name of the player",
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const id = ctx.options.player as string;

        const ingamePlayer = await this.bot.rcon.getIngamePlayer(id);
        const player = await GetPlayer(ingamePlayer?.id || id);

        if (!player)
            return (await ctx.send("Invalid player provided")) as Message;

        const playerData = await this.bot.mordhau.getPlayerData(
            player.ids.playFabID,
            {
                GetPlayerStatistics: true,
            }
        );

        if (!playerData)
            return (await ctx.send("Couldn't get player data")) as Message;

        const statistics = playerData.data.InfoResultPayload.PlayerStatistics;
        if (!statistics)
            return (await ctx.send(
                "Couldn't get player statistics"
            )) as Message;

        function getStat(stat: string) {
            return statistics.find((s) => s.StatisticName === stat);
        }

        const teamFightPoints = getStat("TeamfightRank");
        const teamFightFights = getStat("TeamfightRankSamples");
        const duelPoints = getStat("DuelRank");
        const duelFights = getStat("DuelRankSamples");
        const casualPoints = getStat("CasualRank");
        const casualFights = getStat("CasualRankSamples");

        const adminInServers: string[] = [];

        for (const [serverName, server] of this.bot.servers) {
            if (server.rcon.admins.has(player.id))
                adminInServers.push(serverName);
        }

        await ctx.send({
            content: "",
            embeds: [
                {
                    description: [
                        `**Player Data**\n`,
                        `Is Admin: ${
                            adminInServers.length
                                ? `Yes\n↳ ${adminInServers.join("\n↳ ")}`
                                : "No"
                        }`,
                        `PlayFabID: ${player.ids.playFabID}`,
                        `SteamID: [${player.ids.steamID}](<http://steamcommunity.com/profiles/${player.ids.steamID}>)`,
                        `Name: ${player.name}`,
                        `Teamfight MMR/Rank (${
                            teamFightFights ? teamFightFights.Value : 0
                        } fights): ${
                            teamFightPoints ? teamFightPoints.Value : 0
                        }`,
                        `Duel MMR/Rank (${
                            duelFights ? duelFights.Value : 0
                        } fights): ${duelPoints ? duelPoints.Value : 0}`,
                        `Casual MMR/Rank (${
                            casualFights ? casualFights.Value : 0
                        } fights): ${casualPoints ? casualPoints.Value : 0}`,
                    ].join("\n"),
                    fields: [
                        {
                            name: "Ingame format",
                            value: `\`\`\`${outputPlayerIDs(
                                player.ids,
                                false,
                                true
                            )}, Platform: ${
                                player.platform.name
                            }, PlatformAccountID: ${
                                player.platform.accountID
                            }, Name: ${player.name}\`\`\``,
                        },
                    ],
                },
            ],
        });
    }
}
