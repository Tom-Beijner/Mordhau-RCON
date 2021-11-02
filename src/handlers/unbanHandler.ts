import BasePunishment from "../structures/BasePunishment";
import Watchdog from "../structures/Watchdog";
import logger from "../utils/logger";

export default class UnbanHandler extends BasePunishment {
    constructor(bot: Watchdog) {
        super(bot, "UNBAN");
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

    // Unused, was used when log reading was implemented
    parseMessage(message: string): { admin: string; id: string } | null {
        // LogMordhauPlayerController: Display: Admin AssaultLine (76561198005305380) muted player 76561198966484285 (Duration: 10000)
        const regex = new RegExp(
            /LogMordhauPlayerController: Display: Admin (.+) unbanned player (.+)/g
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
