import BigNumber from "bignumber.js";
import BasePunishment from "../structures/BasePunishment";
import Watchdog from "../structures/Watchdog";
import logger from "../utils/logger";

export default class KickHandler extends BasePunishment {
    constructor(bot: Watchdog) {
        super(bot, "KICK");
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
        duration?: BigNumber,
        reason?: string
    ) {
        this.savePayload({
            player,
            server,
            date,
            reason,
            admin,
        });
    }

    // Unused, was used when log reading was implemented
    parseMessage(
        message: string
    ): { admin: string; id: string; reason?: string } | null {
        if (message.includes("reason: Idle")) {
            return;
        }

        // LogMordhauPlayerController: Display: Admin dan from dans duels (FFBCF4758910B074) kicked player D0904EAFADF55768 (Reason: test kick)
        const regex = new RegExp(
            /LogMordhauPlayerController: Display: Admin (.+) kicked player (.+) \(Reason: (.*)\)/g
        );
        const regexParsed = regex.exec(message);

        if (!regexParsed) {
            logger.error("Bot", "Failed to parse the regex for message");
            return;
        }

        const admin = regexParsed[1];
        const id = regexParsed[2];
        let reason: string;
        try {
            reason = regexParsed[3];
        } catch {
            reason = "None given";
        }
        return { admin, id, reason };
    }
}
