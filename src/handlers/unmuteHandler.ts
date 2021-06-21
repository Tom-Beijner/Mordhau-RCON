import BasePunishment from "../structures/BasePunishment";
import Watchdog from "../structures/Watchdog";
import logger from "../utils/logger";

export default class UnmuteHandler extends BasePunishment {
    constructor(bot: Watchdog) {
        super(bot, "UNMUTE");
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
        }
    ) {
        this.savePayload({
            player,
            server,
            date,
            admin,
        });
    }

    parseMessage(
        message: string
    ): { admin: string; id: string; reason?: string } | null {
        if (message.includes("reason: Idle")) {
            return;
        }

        // ogMordhauPlayerController: Display: Admin dan from dans duels (FFBCF4758910B074) unmuted player D0904EAFADF55768
        const regex = new RegExp(
            /LogMordhauPlayerController: Display: Admin (.+) unmuted player (.+)/g
        );
        const regexParsed = regex.exec(message);

        if (!regexParsed) {
            logger.error("Bot", "Failed to parse the regex for message");
            return;
        }

        const admin = regexParsed[1];
        const id = regexParsed[2];

        return { admin, id };
    }
}
