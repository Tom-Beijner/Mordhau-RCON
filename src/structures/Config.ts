import Conf from "conf";

export interface Config {
    ingamePrefix: string;
    autoUpdate: AutoUpdate;
    bot: Bot;
    servers: Server[];
    adminListSaving: AdminListSaving;
    killstreakMessages: { [key: string]: string };
    automod: Automod;
    discord: Discord;
    mordhau: Mordhau;
    steam: Steam;
    database: Database;
}

export interface AdminListSaving {
    rollbackAdmins: boolean;
}

export interface AutoUpdate {
    enabled: boolean;
    checkInterval: number;
}

export interface Automod {
    adminsBypass: boolean;
    infractionThresholds: { [key: string]: InfractionThreshold };
}

export interface InfractionThreshold {
    type: string;
    message: string;
    duration?: number;
    reason?: string;
}

export interface Bot {
    token: string;
    publicKey: string;
    id: string;
}

export interface Database {
    host: string;
    database: string;
    username: string;
    password: string;
}

export interface Discord {
    guildId: string;
    roles: Role[];
}

export interface Role {
    name: string;
    Ids: string[];
    commands: string[];
    receiveMentions?: boolean;
}

export interface Mordhau {
    accountId: string;
}

export interface Server {
    name: string;
    rcon: Rcon;
}

export interface Rcon {
    host: string;
    port: number;
    password: string;
    adminListSaving: boolean;
    ignoreGlobalPunishments: boolean;
    killstreaks: Killstreaks;
    automod: boolean;
    punishments: Punishments;
    logChannels: LogChannels;
}

export interface Killstreaks {
    enabled: boolean;
    countBotKills: boolean;
}

export interface LogChannels {
    chat: string;
    punishments: string;
    activity: string;
    wanted: string;
    permanent: string;
    automod: string;
    killstreak: string;
    adminCalls: string;
}

export interface Punishments {
    shouldSave: boolean;
    types: Types;
}

export interface Types {
    kicks: boolean;
    bans: boolean;
    unbans: boolean;
    mutes: boolean;
    unmutes: boolean;
}

export interface Steam {
    key: string;
}

// https://stackoverflow.com/a/47058976
type PathsToStringProps<T> = T extends string
    ? []
    : {
          [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
      }[Extract<keyof T, string>];

type Join<T extends string[], D extends string> = T extends []
    ? never
    : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
    ? F extends string
        ? `${F}${D}${Join<Extract<R, string[]>, D>}`
        : never
    : string;

export default new Conf<Config>({
    configName: "config",
    cwd: "./",
    accessPropertiesByDotNotation: true,
    schema: {
        // env: {
        //     type: "string",
        //     default: "development",
        //     enum: ["development", "production"],
        // },
        ingamePrefix: {
            type: "string",
            minLength: 1,
        },
        autoUpdate: {
            type: "object",
            properties: {
                enabled: {
                    type: "boolean",
                },
                checkInterval: {
                    type: "number",
                    exclusiveMinimum: 0,
                },
            },
            required: ["enabled", "checkInterval"],
        },
        bot: {
            type: "object",
            properties: {
                token: {
                    type: "string",
                },
                publicKey: {
                    type: "string",
                },
                id: {
                    type: "string",
                },
            },
            required: ["token", "publicKey", "id"],
        },
        servers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                    },
                    rcon: {
                        type: "object",
                        properties: {
                            host: {
                                type: "string",
                            },
                            port: {
                                type: "number",
                            },
                            password: {
                                type: "string",
                            },
                            adminListSaving: {
                                type: "boolean",
                            },
                            ignoreGlobalPunishments: {
                                type: "boolean",
                            },
                            killstreaks: {
                                type: "object",
                                properties: {
                                    enabled: {
                                        type: "boolean",
                                    },
                                    countBotKills: {
                                        type: "boolean",
                                    },
                                },
                                required: ["enabled", "countBotKills"],
                            },
                            automod: {
                                type: "boolean",
                            },
                            punishments: {
                                type: "object",
                                properties: {
                                    shouldSave: {
                                        type: "boolean",
                                    },
                                    types: {
                                        type: "object",
                                        properties: {
                                            kicks: {
                                                type: "boolean",
                                            },
                                            bans: {
                                                type: "boolean",
                                            },
                                            unbans: {
                                                type: "boolean",
                                            },
                                            mutes: {
                                                type: "boolean",
                                            },
                                            unmutes: {
                                                type: "boolean",
                                            },
                                        },
                                        required: [
                                            "kicks",
                                            "bans",
                                            "unbans",
                                            "mutes",
                                            "unmutes",
                                        ],
                                    },
                                },
                                required: ["shouldSave", "types"],
                            },
                            logChannels: {
                                type: "object",
                                properties: {
                                    chat: {
                                        type: "string",
                                    },
                                    punishments: {
                                        type: "string",
                                    },
                                    activity: {
                                        type: "string",
                                    },
                                    wanted: {
                                        type: "string",
                                    },
                                    permanent: {
                                        type: "string",
                                    },
                                    automod: {
                                        type: "string",
                                    },
                                    killstreak: {
                                        type: "string",
                                    },
                                    adminCalls: {
                                        type: "string",
                                    },
                                },
                                required: [
                                    "chat",
                                    "punishments",
                                    "activity",
                                    "wanted",
                                    "permanent",
                                    "automod",
                                    "killstreak",
                                    "adminCalls",
                                ],
                            },
                        },
                        required: [
                            "host",
                            "port",
                            "password",
                            "adminListSaving",
                            "killstreaks",
                            "automod",
                            "punishments",
                            "logChannels",
                        ],
                    },
                },
                required: ["name", "rcon"],
            },
            minItems: 1,
        },
        adminListSaving: {
            type: "object",
            properties: {
                rollbackAdmins: {
                    type: "boolean",
                },
            },
            required: ["rollbackAdmins"],
        },
        killstreakMessages: {
            type: "object",
            patternProperties: {
                "^(([0-9])+)$": {
                    type: "string",
                },
            },
        },
        automod: {
            type: "object",
            properties: {
                adminsBypass: {
                    type: "boolean",
                },
                infractionThresholds: {
                    type: "object",
                    patternProperties: {
                        "^(([0-9])+)$": {
                            type: "object",
                            properties: {
                                type: {
                                    type: "string",
                                    enum: [
                                        "warn",
                                        "mute",
                                        "kick",
                                        "ban",
                                        "globalmute",
                                        "globalban",
                                    ],
                                },
                                message: {
                                    type: "string",
                                },
                                duration: {
                                    type: "number",
                                    minimum: 0,
                                },
                                reason: {
                                    type: "string",
                                },
                            },
                            required: ["type", "message"],
                        },
                    },
                },
            },
            required: ["adminsBypass", "infractionThresholds"],
        },
        discord: {
            type: "object",
            properties: {
                guildId: {
                    type: "string",
                },
                roles: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                            Ids: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                                minItems: 1,
                            },
                            commands: {
                                type: "array",
                                items: {
                                    enum: [
                                        "ban",
                                        "banned",
                                        "chatlog",
                                        "deletehistory",
                                        "deletepunishment",
                                        "globalban",
                                        "globalmute",
                                        "globalunban",
                                        "globalunmute",
                                        "history",
                                        "kick",
                                        "mute",
                                        "rename",
                                        "say",
                                        "unban",
                                        "unmute",
                                        "addadmin",
                                        "removeadmin",
                                        "rcon",
                                        "update",
                                    ],
                                },
                                minItems: 1,
                            },
                        },
                        required: ["name", "Ids", "commands"],
                    },
                    minItems: 1,
                },
            },
            required: ["guildId", "roles"],
        },
        mordhau: {
            type: "object",
            properties: {
                accountId: {
                    type: "string",
                },
            },
            required: ["accountId"],
        },
        steam: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                },
            },
            required: ["key"],
        },
        database: {
            type: "object",
            properties: {
                host: {
                    type: "string",
                },
                database: {
                    type: "string",
                },
                username: {
                    type: "string",
                },
                password: {
                    type: "string",
                },
            },
            required: ["host", "database", "username", "password"],
        },
    },
    defaults: {
        ingamePrefix: "/",
        autoUpdate: {
            enabled: true,
            checkInterval: 30,
        },
        bot: {
            token: "",
            publicKey: "",
            id: "",
        },
        servers: [
            {
                name: "Cool Server",
                rcon: {
                    host: "123.123.123.123",
                    port: 1234,
                    password: "password",
                    adminListSaving: true,
                    ignoreGlobalPunishments: false,
                    killstreaks: {
                        enabled: true,
                        countBotKills: false,
                    },
                    automod: true,
                    punishments: {
                        shouldSave: true,
                        types: {
                            kicks: false,
                            bans: true,
                            unbans: true,
                            mutes: true,
                            unmutes: false,
                        },
                    },
                    logChannels: {
                        chat: "",
                        punishments: "",
                        activity: "",
                        wanted: "",
                        permanent: "",
                        automod: "",
                        killstreak: "",
                        adminCalls: "",
                    },
                },
            },
        ],
        adminListSaving: {
            rollbackAdmins: true,
        },
        killstreakMessages: {
            "1": "{name} got first blood!",
            "5": "KILLING SPREE! {name} has a killstreak of {kills}!",
            "10": "RAMPAGE! {name} has a killstreak of {kills}!",
            "15": "DOMINATING! {name} has a killstreak of {kills}!",
            "20": "UNSTOPPABLE! {name} has a killstreak of {kills}!",
            "25": "GODLIKE! {name} has a killstreak of {kills}!",
            "30": "WICKED SICK! {name} has a killstreak of {kills}!",
        },
        automod: {
            adminsBypass: true,
            infractionThresholds: {
                "1": {
                    type: "warn",
                    message: "{name}, watch your language!",
                },
                "2": {
                    type: "mute",
                    message: "Muted {name} for profane messages!",
                    duration: 1,
                },
                "3": {
                    type: "kick",
                    message: "Kicked {name} for profane messages!",
                    reason: "Sending profane messages (Profane words: {words})",
                },
                "4": {
                    type: "ban",
                    message: "Banned {name} for profane messages!",
                    duration: 1,
                    reason: "Sending profane messages (Profane words: {words})",
                },
                "5": {
                    type: "globalmute",
                    message: "Globally muted {name} for profane messages!",
                    duration: 1,
                },
                "6": {
                    type: "globalban",
                    message: "Globally banned {name} for profane messages!",
                    duration: 1,
                    reason: "Sending profane messages (Profane words: {words})",
                },
            },
        },
        discord: {
            guildId: "",
            roles: [
                {
                    name: "Mods",
                    Ids: [""],
                    commands: [
                        "ban",
                        "banned",
                        "chatlog",
                        "history",
                        "kick",
                        "mute",
                        "rename",
                        "say",
                        "unban",
                        "unmute",
                    ],
                },
                {
                    name: "Admins",
                    Ids: [""],
                    commands: [
                        "ban",
                        "banned",
                        "globalban",
                        "globalmute",
                        "globalunban",
                        "globalunmute",
                        "history",
                        "kick",
                        "mute",
                        "rename",
                        "say",
                        "unban",
                        "unmute",
                    ],
                },
                {
                    name: "Owner",
                    Ids: [""],
                    commands: [
                        "ban",
                        "banned",
                        "deletehistory",
                        "deletepunishment",
                        "globalban",
                        "globalmute",
                        "globalunban",
                        "globalunmute",
                        "history",
                        "kick",
                        "mute",
                        "rename",
                        "say",
                        "unban",
                        "unmute",
                        "addadmin",
                        "removeadmin",
                        "rcon",
                        "update",
                    ],
                    receiveMentions: true,
                },
            ],
        },
        mordhau: {
            accountId: "",
        },
        steam: {
            key: "",
        },
        database: {
            host: "",
            database: "",
            username: "",
            password: "",
        },
    },
    migrations: {
        "1.4.0": (store) => {
            const servers = store.get("servers");

            for (let i = 0; i < servers.length; i++) {
                store.set(`servers[${i}].rcon.ignoreGlobalPunishments`, false);
                store.set(`servers[${i}].rcon.logChannels`, {
                    chat: "",
                    punishments: "",
                    activity: "",
                    wanted: "",
                    permanent: "",
                    automod: "",
                    killstreak: "",
                    adminCalls: "",
                });
                // @ts-ignore
                store.delete("discord.webhookEndpoints");
            }
        },
    },
});
