import { Message } from "eris";
import Fuse from "fuse.js";
import { PlayFabClient } from "playfab-sdk";
import { promisify } from "util";
import { LookupPlayer } from "../services/PlayFab";
import AdminActivityConfig from "../structures/AdminActivityConfig";
import BaseEvent from "../structures/BaseEvent";
import Config from "../structures/Config";
import StatsConfig from "../structures/StatsConfig";
import Watchdog from "../structures/Watchdog";
const GetServerList = promisify(PlayFabClient.GetCurrentGames);

export default class messageCreate extends BaseEvent {
    async execute(bot: Watchdog, message: Message) {
        if (message.author.id === bot.client.user.id || !message.author.bot)
            return;

        if (message.embeds.length) {
            if (
                Config.get("servers").find(
                    (s) =>
                        s.rcon?.stats?.adminActionWebhookChannel ===
                        message.channel.id
                )
            ) {
                const embed = message.embeds[0];
                if (!embed) return;
                if (
                    embed.title === "Admin Action" &&
                    embed.description.includes("**Command:**")
                ) {
                    const currentDate = new Date().toISOString().slice(0, 10);
                    const lines = embed.description.split("\n");
                    const command = lines
                        .find((l) => l.includes("**Command:**"))
                        .split("**Command:** ")[1]
                        .toLowerCase();
                    let server = lines
                        .find((l) => l.includes("**Server:**"))
                        .split("**Server:** ")[1];

                    // const fetchedServer = new Fuse(
                    //     (await GetServerList({})).data.Games,
                    //     {
                    //         threshold: 0.4,
                    //         keys: [
                    //             {
                    //                 name: "Tags.ServerName",
                    //                 weight: 1,
                    //             },
                    //         ],
                    //     }
                    // ).search(server)[0]?.item;
                    // if (!fetchedServer) return;

                    server = new Fuse(await bot.rcon.getServersInfo(), {
                        threshold: 0.4,
                        keys: [
                            {
                                name: "data.name",
                                weight: 1,
                            },
                        ],
                    }).search(server)[0]?.item?.server;
                    if (!server) return;

                    const adminParse = lines.find((l) =>
                        l.includes("**Admin:**")
                    );
                    const adminID = adminParse
                        .split(" ")
                        .pop()
                        .replace(/[()]/g, "");
                    const admin =
                        bot.cachedPlayers.get(adminID) ||
                        (await LookupPlayer(adminID));

                    StatsConfig.set(`admins.${adminID}.name`, admin.name);
                    StatsConfig.set(
                        `admins.${adminID}.servers.${server}.adminActions.${currentDate}.${command}`,
                        StatsConfig.get(
                            `admins.${adminID}.servers.${server}.adminActions.${currentDate}.${command}`,
                            0
                        ) + 1
                    );

                    AdminActivityConfig.set(
                        `admins.${admin.id}.name`,
                        admin.name
                    );

                    // if (["add admin", "remove admin"].includes(command.toLocaleLowerCase())) {
                    //     const target = lines
                    //         .find((l) => l.includes("**Details:**"))
                    //         .split("**Details:** ")[1].split("=")[1].replace(new RegExp(/\*/g), "");
                    //     const targetPlayer = bot.cachedPlayers.get(target) ||
                    //     (await LookupPlayer(target));

                        
                    // }
                }
            }
        } else if (
            Config.get("servers").find(
                (s) =>
                    s.rcon?.stats?.serverLagReportsWebhookChannel ===
                    message.channel.id
            )
        ) {
            // not working rn so cant test
            return;
        }
    }
}
