import Conf from "conf";

export interface Config {
    ingamePrefix: string;
    autoUpdate: AutoUpdate;
    bot: Bot;
    syncServerPunishments: boolean;
    servers: Server[];
    adminListSaving: AdminListSaving;
    killstreakMessages: { [key: string]: string };
    automod: Automod;
    warns: Warns;
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
    infiniteDurationScaling: boolean;
    adminsBypass: boolean;
    infractionThresholds: { [key: string]: InfractionThreshold };
}

export interface Warns {
    infiniteDurationScaling: boolean;
    resetAfterDuration: number;
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
    ingameCommands: string[];
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
    warns: string;
}

export interface IngameCommands {}

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
        },
        bot: {
            type: "object",
            properties: {
                token: {
                    type: "string",
                    minLength: 1,
                },
                publicKey: {
                    type: "string",
                    minLength: 1,
                },
                id: {
                    type: "string",
                    minLength: 1,
                },
            },
            required: ["token", "publicKey", "id"],
        },
        syncServerPunishments: {
            type: "boolean",
        },
        servers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                    },
                    rcon: {
                        type: "object",
                        properties: {
                            host: {
                                type: "string",
                                minLength: 1,
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
                                    },
                                },
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
                                    warns: {
                                        type: "string",
                                    },
                                },
                            },
                            ingameCommands: {
                                type: "array",
                                items: {
                                    enum: [
                                        "killstreak",
                                        "requestadmin",
                                        "topkillstreak",
                                        "ban",
                                        "kick",
                                        "mute",
                                        "unban",
                                        "unmute",
                                        "warn",
                                        "unwarn",
                                    ],
                                },
                                minItems: 1,
                                uniqueItems: true,
                            },
                        },
                        required: ["host", "port", "password"],
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
        },
        killstreakMessages: {
            type: "object",
            patternProperties: {
                "^(([0-9])+)$": {
                    type: "string",
                    minLength: 1,
                },
            },
            minProperties: 1,
        },
        automod: {
            type: "object",
            properties: {
                infiniteDurationScaling: {
                    type: "boolean",
                },
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
                                        "message",
                                        "mute",
                                        "kick",
                                        "ban",
                                        "globalmute",
                                        "globalban",
                                    ],
                                },
                                message: {
                                    type: "string",
                                    minLength: 1,
                                },
                                duration: {
                                    type: "number",
                                    minimum: 0,
                                },
                                reason: {
                                    type: "string",
                                    minLength: 1,
                                },
                            },
                            required: ["type", "message"],
                        },
                    },
                    minProperties: 1,
                },
            },
        },
        warns: {
            type: "object",
            properties: {
                infiniteDurationScaling: {
                    type: "boolean",
                },
                resetAfterDuration: {
                    type: "number",
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
                                        "message",
                                        "mute",
                                        "kick",
                                        "ban",
                                        "globalmute",
                                        "globalban",
                                    ],
                                },
                                message: {
                                    type: "string",
                                    minLength: 1,
                                },
                                duration: {
                                    type: "number",
                                    minimum: 0,
                                },
                                reason: {
                                    type: "string",
                                    minLength: 1,
                                },
                            },
                            required: ["type", "message"],
                        },
                    },
                    minProperties: 1,
                },
            },
        },
        discord: {
            type: "object",
            properties: {
                guildId: {
                    type: "string",
                    minLength: 1,
                },
                roles: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                minLength: 1,
                            },
                            Ids: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                                minItems: 1,
                                uniqueItems: true,
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
                                        "warn",
                                        "unwarn",
                                        "resetwarnings",
                                        "addadmin",
                                        "removeadmin",
                                        "globaladdadmin",
                                        "globalremoveadmin",
                                        "rcon",
                                        "update",
                                    ],
                                },
                                minItems: 1,
                                uniqueItems: true,
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
                    minLength: 1,
                },
            },
            required: ["accountId"],
        },
        steam: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                    minLength: 1,
                },
            },
            required: ["key"],
        },
        database: {
            type: "object",
            properties: {
                host: {
                    type: "string",
                    minLength: 1,
                },
                database: {
                    type: "string",
                    minLength: 1,
                },
                username: {
                    type: "string",
                    minLength: 1,
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
        syncServerPunishments: false,
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
                        warns: "",
                    },
                    ingameCommands: [
                        "killstreak",
                        "requestadmin",
                        "topkillstreak",
                        "ban",
                        "kick",
                        "mute",
                        "unban",
                        "unmute",
                        "warn",
                        "unwarn",
                    ],
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
            infiniteDurationScaling: true,
            adminsBypass: true,
            infractionThresholds: {
                "1": {
                    type: "message",
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
        warns: {
            infiniteDurationScaling: true,
            resetAfterDuration: 43830,
            infractionThresholds: {
                "1": {
                    type: "message",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings!",
                },
                "2": {
                    type: "mute",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings and got muted!",
                    duration: 300,
                },
                "3": {
                    type: "kick",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings and got kicked!",
                    reason: "You reached a warning infraction threshold",
                },
                "4": {
                    type: "ban",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings and got banned!",
                    duration: 300,
                    reason: "You reached a warning infraction threshold",
                },
                "5": {
                    type: "globalmute",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings and got globally muted!",
                    duration: 300,
                },
                "6": {
                    type: "globalban",
                    message:
                        "{name} now has {currentWarns}/{maxWarns} warnings and got globally banned!",
                    duration: 300,
                    reason: "You reached a warning infraction threshold",
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
                        "warn",
                        "unwarn",
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
                        "warn",
                        "unwarn",
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
                        "warn",
                        "unwarn",
                        "resetwarnings",
                        "addadmin",
                        "removeadmin",
                        "globaladdadmin",
                        "globalremoveadmin",
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
        // "1.4.0": (store) => {
        //     const servers = store.get("servers");

        //     for (let i = 0; i < servers.length; i++) {
        //         store.set(`servers.${i}.rcon.ignoreGlobalPunishments`, false);
        //         store.set(`servers.${i}.rcon.logChannels`, {
        //             chat: "",
        //             punishments: "",
        //             activity: "",
        //             wanted: "",
        //             permanent: "",
        //             automod: "",
        //             killstreak: "",
        //             adminCalls: "",
        //         });
        //         // @ts-ignore
        //         store.delete("discord.webhookEndpoints");
        //     }
        // },
        // "1.7.0": (store) => {
        //     const servers = store.get("servers");

        //     for (let i = 0; i < servers.length; i++) {
        //         store.set(`servers.${i}.rcon.ingameCommands`, [
        //             "killstreak",
        //             "requestadmin",
        //             "topkillstreak",
        //             "ban",
        //             "kick",
        //             "mute",
        //             "unban",
        //             "unmute",
        //         ]);
        //     }
        // },
        // "1.8.0": (store) => {
        //     for (const infractionsThreshhold in store.get(
        //         "automod.infractionThresholds"
        //     ) as { [key: string]: InfractionThreshold }) {
        //         if (
        //             (
        //                 store.get(
        //                     `automod.infractionThresholds.${infractionsThreshhold}`
        //                 ) as InfractionThreshold
        //             ).type !== "warn"
        //         )
        //             continue;

        //         store.set(
        //             `automod.infractionThresholds.${infractionsThreshhold}`,
        //             {
        //                 ...(store.get(
        //                     `automod.infractionThresholds.${infractionsThreshhold}`
        //                 ) as InfractionThreshold),
        //                 type: "message",
        //             }
        //         );
        //     }
        // },
        "1.9.0": (store) => {
            store.set("automod.infiniteDurationScaling", true);
            store.set("warns.infiniteDurationScaling", true);
        },
    },
});
