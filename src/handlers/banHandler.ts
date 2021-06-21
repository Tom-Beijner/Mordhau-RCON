import BasePunishment from "../structures/BasePunishment";
import Watchdog from "../structures/Watchdog";
import logger from "../utils/logger";
import { outputPlayerIDs } from "../utils/PlayerID";

export default class BanHandler extends BasePunishment {
    constructor(bot: Watchdog) {
        super(bot, "BAN");
    }

    async handler(
        server: string,
        date: number,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        },
        duration?: number,
        reason?: string
    ) {
        if (reason == "Idle") {
            logger.debug(
                "Bot",
                "Player kicked for being idle. No action required."
            );
        }

        if (!reason?.includes("Vote kick")) {
            this.savePayload({
                player,
                server,
                date,
                duration,
                reason,
                admin,
            });
        } else {
            logger.info(
                "Bot",
                `Player ${player.name} (${outputPlayerIDs(
                    player.ids,
                    true
                )}) was kicked by vote - not sending discord notification.`
            );
        }
    }

    parseMessage(
        message: string
    ): { admin: string; id: string; duration: string; reason?: string } | null {
        if (message.includes("reason: Idle")) {
            return;
        }

        // LogMordhauPlayerController: Display: Admin BIG | dan (76561198292933506) banned player 76561199053620235 (Duration: 0, Reason: RDM)
        const regex = new RegExp(
            /LogMordhauPlayerController: Display: Admin (.+) banned player (.+) \(Duration: (.+), Reason: (.*)\)/g
        );
        const regexParsed = regex.exec(message);

        if (!regexParsed) {
            logger.error("Bot", "Failed to parse the regex for message");
            return;
        }

        const admin = regexParsed[1];
        const id = regexParsed[2];
        const duration = regexParsed[3];
        let reason: string;
        try {
            reason = regexParsed[4];
        } catch {
            reason = "None given";
        }
        return { admin, id, duration, reason };
    }
}
