import flatMap from "array.prototype.flatmap";
import NodeCache from "node-cache";
import english from "retext-english";
import factory from "retext-profanities/factory.js";
import stringify from "retext-stringify";
import unified from "unified";
import config from "../config.json";
import baseList from "../locales/bannedWords.json";
import { sendWebhookMessage } from "../services/Discord";
import logger from "../utils/logger";
import { outputPlayerIDs } from "../utils/PlayerID";
import Rcon from "./Rcon";
import Watchdog from "./Watchdog";

interface IOptions {
    name?: string;
    channelID: string;
    muteDuration?: number;
    banDuration?: number;
    muteThreshold?: number;
    banThreshold?: number;
    ignoredPlayers?: string[];
}

export default class AntiSlur {
    // <
    //     string,
    //     { message: string; profaneWords: string[] }[]
    // >
    public cache: {
        playerMessages: NodeCache;
    } = {
        // TTL 8.333333 hours
        playerMessages: new NodeCache({ stdTTL: 30000 }),
    };
    private bot: Watchdog;
    public options: IOptions;
    private stringChecker: unified.Processor<unified.Settings>;

    constructor(bot: Watchdog, options?: IOptions) {
        this.options = options || {
            name: "AutoMod",
            channelID: config.discord.webhookEndpoints.automod,
            muteDuration: 500,
            banDuration: 500,
            muteThreshold: 1,
            banThreshold: 2,
            ignoredPlayers: [],
        };
        this.bot = bot;
        this.stringChecker = unified()
            .use(english)
            .use(
                factory({
                    lang: "en",
                    cuss: baseList.words.reduce((result, word) => {
                        result[word] = 1;
                        return result;
                    }, {}),
                    pluralize: require("pluralize"),
                    // Misclassified singulars and plurals.
                    ignorePluralize: [
                        "children",
                        "dy", // Singular of `dies`.
                        "pro", // Singular of `pros`.
                        "so", // Singular of `sos`.
                        "dice", // Plural of `die`.
                        "fus", // Plural of `fu`.
                    ],
                    // List of values not to normalize.
                    regular: ["hell"],
                })
            )
            .use(stringify);
    }

    private sendMessage(message: string) {
        return sendWebhookMessage(this.options.channelID, message);
    }

    public async check(
        rcon: Rcon,
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name: string;
        },
        message: string
    ) {
        if (rcon.admins.has(player.id)) return;

        const result = await this.stringChecker.process(message);

        if (!result.messages.length) return;

        const profaneWords = result.messages.map((word) => word.ruleId);

        logger.debug(
            this.options.name,
            `${player.name} (${outputPlayerIDs(
                player.ids
            )}) sent a profane message (Server: ${
                rcon.options.name
            }, Message: ${message}, Profane words: ${profaneWords.join(", ")})`
        );

        this.cache.playerMessages.set(player.id, [
            ...((this.cache.playerMessages.get(player.id) as []) || []),
            { message, profaneWords },
        ]);

        const playerMessages: {
            message: string;
            profaneWords: string[];
        }[] = this.cache.playerMessages.get(player.id) || [];
        const allProfaneWords = flatMap(
            playerMessages,
            (message) => message.profaneWords
        ).join(", ");

        if (playerMessages.length > this.options.banThreshold) {
            const duration = this.options.banDuration;
            const reason = `${this.options.name}: Sending profane messages (Profane words: ${allProfaneWords})`;

            const error = await rcon.banUser(
                this.bot.cachedPlayers.get(player.id)?.server,
                {
                    ids: { playFabID: "1337" },
                    id: "1337",
                    name: this.options.name,
                },
                player,
                duration,
                reason
            );

            if (error) {
                logger.error(
                    this.options.name,
                    `Error occurred while banning ${
                        player.name
                    } (${outputPlayerIDs(player.ids)}, Error: ${error})`
                );
            } else {
                await rcon.say(
                    `${this.options.name}: Banned ${player.name} for profane messages!`
                );

                this.sendMessage(
                    `Banned ${player.name} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}) for profane messages (Server: ${
                        rcon.options.name
                    }, Duration: ${duration}, Profane words: ${allProfaneWords})`
                );

                logger.info(
                    this.options.name,
                    `Banned ${player.name} (${outputPlayerIDs(
                        player.ids
                    )}) for profane messages (Server: ${
                        rcon.options.name
                    }, Duration: ${duration}, Profane words: ${allProfaneWords})`
                );

                this.cache.playerMessages.del(player.id);
            }
        } else if (playerMessages.length > this.options.muteThreshold) {
            const duration = this.options.muteDuration;
            const error = await rcon.muteUser(
                this.bot.cachedPlayers.get(player.id)?.server,
                {
                    ids: { playFabID: "1337" },
                    id: "1337",
                    name: this.options.name,
                },
                player,
                duration
            );

            if (error) {
                logger.error(
                    this.options.name,
                    `Error occurred while muting ${
                        player.name
                    } (${outputPlayerIDs(player.ids)}) (${error})`
                );
            } else {
                await rcon.say(
                    `${this.options.name}: Muted ${player.name} for profane messages!`
                );

                this.sendMessage(
                    `Muted ${player.name} (${outputPlayerIDs(
                        player.ids,
                        true
                    )}) for sending profane messages (Server: ${
                        rcon.options.name
                    }, Duration: ${duration}, Profane words: ${allProfaneWords})`
                );

                logger.info(
                    this.options.name,
                    `Muted ${player.name} (${outputPlayerIDs(
                        player.ids
                    )}) for sending profane messages (Server: ${
                        rcon.options.name
                    }, Duration: ${duration}, Profane words: ${allProfaneWords})`
                );
            }
        } else {
            // Warn player for using profane word
            await rcon.say(
                `${this.options.name}: ${player.name}, watch your language!`
            );

            this.sendMessage(
                `Warned ${player.name} (${outputPlayerIDs(
                    player.ids,
                    true
                )}) for profane message (Server: ${
                    rcon.options.name
                }, Messages: ${
                    playerMessages.length
                }, Profane words: ${allProfaneWords})`
            );

            logger.info(
                this.options.name,
                `Warned ${player.name} (${outputPlayerIDs(
                    player.ids
                )}) for profane message (Server: ${
                    rcon.options.name
                }, Messages: ${
                    playerMessages.length
                }, Profane words: ${allProfaneWords})`
            );
        }
    }
}
