import { Message } from "eris";
import { LookupPlayer } from "../services/PlayFab";
import AdminActivityConfig from "../structures/AdminActivityConfig";
import BaseEvent from "../structures/BaseEvent";
import Config from "../structures/Config";
import StatsConfig from "../structures/StatsConfig";
import Watchdog from "../structures/Watchdog";

export default class messageCreate extends BaseEvent {
    async execute(bot: Watchdog, message: Message) {
        if (message.author.id === bot.client.user.id || !message.author.bot)
            return;

        if (message.embeds.length) {
            if (
                Config.get("servers").find(
                    (s) =>
                        s.rcon.stats.adminActionWebhookChannel ===
                        message.channel.id
                )
            ) {
                const embed = message.embeds[0];
                if (!embed) return;
                if (
                    embed.title === "Admin Action" &&
                    embed.description.includes("**Command:**")
                ) {
                    console.log(message.embeds[0].title);

                    const currentDate = new Date().toISOString().slice(0, 10);
                    const lines = embed.description.split("\n");
                    const command = lines
                        .find((l) => l.includes("**Command:**"))
                        .split("**Command:** ")[1]
                        .toLowerCase();
                    let server = lines
                        .find((l) => l.includes("**Server:**"))
                        .split("**Server:** ")[1];

                    server =
                        (await bot.rcon.getServersInfo()).find(
                            (s) => s?.data?.name === server
                        )?.data?.name ||
                        Config.get("servers").find(
                            (s) =>
                                s?.rcon?.status?.fallbackValues?.serverName ===
                                server
                        )?.rcon?.status?.fallbackValues?.serverName;

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
                }
            }
        } else if (
            Config.get("servers").find(
                (s) =>
                    s.rcon.stats.serverLagReportsWebhookChannel ===
                    message.channel.id
            )
        ) {
            // not working rn so cant test
            return;
        }
    }
}
