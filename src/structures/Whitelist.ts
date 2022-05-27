import Conf from "conf";
import { sendWebhookMessage } from "../services/Discord";
import logger from "../utils/logger";
import parseOut from "../utils/parseOut";
import { outputPlayerIDs } from "../utils/PlayerID";
import Rcon from "./Rcon";
import Watchdog from "./Watchdog";

export default class AutoMod {
    private bot: Watchdog;
    private config = new Conf({
        configName: "whitelist",
        cwd: "./",
        accessPropertiesByDotNotation: true,
        schema: {
            servers: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                        },
                        enabled: {
                            type: "boolean",
                        },
                    },
                },
            },
            players: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                        },
                        server: {
                            type: "string",
                        },
                    },
                },
            },
        },
        defaults: {
            servers: [],
            players: [],
        },
    });

    constructor(bot: Watchdog) {
        this.bot = bot;
    }

    private sendMessage(
        webhookCredentials: { id: string; token: string },
        message: string
    ) {
        return sendWebhookMessage(webhookCredentials, message);
    }

    public async check(
        rcon: Rcon,
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name: string;
        }
    ) {
        const server = (
            this.config.get("servers") as {
                name: string;
                enabled: boolean;
            }[]
        ).find((s) => s.name === rcon.options.name);
        if (
            !(server && server.enabled) ||
            rcon.admins.has(player.id) ||
            (
                this.config.get("players") as { id: string; server: string }[]
            ).find((p) => p.id === player.id && p.server === rcon.options.name)
        ) {
            return false;
        }

        await rcon.send(
            `kick ${player.id} You are not whitelisted on this server.`
        );

        // else {
        //     await rcon.say(
        //         `${player.name} (${outputPlayerIDs(
        //             player.ids
        //         )}) was kicked for not being whitelisted.`
        //     );
        // }

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) was kicked for not being whitelisted (Server: ${
                rcon.options.name
            })`
        );

        logger.info(
            "Whitelist",
            `${player.name} (${outputPlayerIDs(
                player.ids
            )}) was kicked for not being whitelisted (Server: ${
                rcon.options.name
            })`
        );

        return true;
    }

    public async on(
        rcon: Rcon,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        }
    ) {
        const server = (
            this.config.get("servers") as {
                name: string;
                enabled: boolean;
            }[]
        ).find((s) => s.name === rcon.options.name);
        if (server && server.enabled) {
            return `${rcon.options.name} is already enabled.`;
        }

        this.config.set("servers", [
            ...(this.config.get("servers") as {
                name: string;
                enabled: boolean;
            }[]),
            {
                name: rcon.options.name,
                enabled: true,
            },
        ]);

        rcon.say(`Whitelist has been enabled`);

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) enabled the whitelist (Server: ${rcon.options.name})`
        );

        logger.info(
            "Whitelist",
            `${admin.name} (${outputPlayerIDs(
                admin.ids
            )}) enabled the whitelist (Server: ${rcon.options.name})`
        );
    }

    public async off(
        rcon: Rcon,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        }
    ) {
        const server = (
            this.config.get("servers") as {
                name: string;
                enabled: boolean;
            }[]
        ).find((s) => s.name === rcon.options.name);
        if (server && !server.enabled) {
            return `${rcon.options.name} is already disabled.`;
        }

        this.config.set(
            "servers",
            (
                this.config.get("servers") as {
                    name: string;
                    enabled: boolean;
                }[]
            ).filter((s) => s.name !== rcon.options.name)
        );

        rcon.say(`Whitelist has been disabled`);

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) disabled the whitelist (Server: ${rcon.options.name})`
        );

        logger.info(
            "Whitelist",
            `${admin.name} (${outputPlayerIDs(
                admin.ids
            )}) disabled the whitelist (Server: ${rcon.options.name})`
        );
    }

    public async list(rcon: Rcon) {
        return (
            this.config.get("players") as { id: string; server: string }[]
        ).filter((p) => p.server === rcon.options.name);
    }

    public add(
        rcon: Rcon,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        },
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        }
    ) {
        if (
            (
                this.config.get("players") as { id: string; server: string }[]
            ).find((p) => p.id === player.id && p.server === rcon.options.name)
        ) {
            return `${parseOut(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) is already whitelisted.`;
        }

        this.config.set("players", [
            ...(this.config.get("players") as { id: string; server: string }[]),
            {
                id: player.id,
                server: rcon.options.name,
            },
        ]);

        rcon.say(
            `${player.name} (${outputPlayerIDs(player.ids)}) was whitelisted.`
        );

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) added ${parseOut(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) to the whitelist (Server: ${rcon.options.name})`
        );

        logger.info(
            "Whitelist",
            `${admin.name} (${outputPlayerIDs(admin.ids)}) added ${
                player.name
            } (${outputPlayerIDs(player.ids)}) to the whitelist (Server: ${
                rcon.options.name
            })`
        );
    }

    public remove(
        rcon: Rcon,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        },
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        }
    ) {
        if (
            !(
                this.config.get("players") as { id: string; server: string }[]
            ).find((p) => p.id === player.id && p.server === rcon.options.name)
        ) {
            return `${parseOut(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) is not whitelisted.`;
        }

        this.config.set(
            "players",
            (
                this.config.get("players") as {
                    id: string;
                    server: string;
                }[]
            ).filter(
                (p) => p.id !== player.id || p.server !== rcon.options.name
            )
        );

        rcon.say(
            `${player.name} (${outputPlayerIDs(
                player.ids
            )}) was removed from the whitelist.`
        );

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) removed ${parseOut(player.name)} (${outputPlayerIDs(
                player.ids,
                true
            )}) from the whitelist (Server: ${rcon.options.name})`
        );

        logger.info(
            "Whitelist",
            `${admin.name} (${outputPlayerIDs(admin.ids)}) removed ${
                player.name
            } (${outputPlayerIDs(player.ids)}) from the whitelist (Server: ${
                rcon.options.name
            })`
        );
    }

    public async clear(
        rcon: Rcon,
        admin: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name: string;
        }
    ) {
        if (
            !(
                this.config.get("players") as {
                    id: string;
                    server: string;
                }[]
            ).filter((p) => p.server === rcon.options.name).length
        ) {
            return `There are no whitelisted players.`;
        }

        this.config.set(
            "players",
            (
                this.config.get("players") as {
                    id: string;
                    server: string;
                }[]
            ).filter((p) => p.server !== rcon.options.name)
        );

        rcon.say(`The whitelist has been cleared.`);

        this.sendMessage(
            rcon.webhooks.get("activity"),
            `${parseOut(admin.name)} (${outputPlayerIDs(
                admin.ids,
                true
            )}) cleared the whitelist (Server: ${rcon.options.name})`
        );

        logger.info(
            "Whitelist",
            `${admin.name} (${outputPlayerIDs(
                admin.ids
            )}) cleared the whitelist (Server: ${rcon.options.name})`
        );
    }
}
