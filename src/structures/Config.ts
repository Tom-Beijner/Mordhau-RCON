import Conf from "conf";

export interface Config {
    ingamePrefix: string;
    autoUpdate: AutoUpdate;
    consoleTimezone: string;
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
    teleportSystem: boolean;
    killstreaks: Killstreaks;
    automod: boolean;
    punishments: Punishments;
    status: ServerStatus;
    mapVote: MapVote;
    saveAdminActivity: boolean;
    stats: Stats;
    logChannels: LogChannels;
    ingameCommands: string[];
}

export interface ServerStatus {
    updateInterval: number;
    channel: string;
    showPlayerList: boolean;
    hideIPPort: boolean;
    fallbackValues: FallbackValues;
}

export interface MapVote {
    enabled: boolean;
    voteDuration: number;
    voteCooldown: number;
    voteThreshold: number;
    initialDelay: number;
    maps: Maps[];
}

export interface Maps {
    shownName: string;
    map: string;
}
export interface FallbackValues {
    serverName?: string;
    serverPort?: number;
    maxPlayerCount: number;
    passwordProtected: boolean;
}
export interface Killstreaks {
    enabled: boolean;
    countBotKills: boolean;
}

export interface Stats {
    adminActionWebhookChannel: string;
    serverLagReportsWebhookChannel: string;
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
            default: "-",
        },
        autoUpdate: {
            type: "object",
            properties: {
                enabled: {
                    type: "boolean",
                    default: true,
                },
                checkInterval: {
                    type: "number",
                    exclusiveMinimum: 0,
                    default: 30,
                },
            },
        },
        consoleTimezone: {
            type: "string",
            default: "",
        },
        bot: {
            type: "object",
            properties: {
                token: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
                publicKey: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
                id: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
            },
            required: ["token", "publicKey", "id"],
        },
        syncServerPunishments: {
            type: "boolean",
            default: false,
        },
        servers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        default: "Cool Server",
                    },
                    rcon: {
                        type: "object",
                        properties: {
                            host: {
                                type: "string",
                                minLength: 1,
                                default: "123.123.123.123",
                            },
                            port: {
                                type: "number",
                                default: 1234,
                            },
                            password: {
                                type: "string",
                                default: "password",
                            },
                            adminListSaving: {
                                type: "boolean",
                                default: true,
                            },
                            ignoreGlobalPunishments: {
                                type: "boolean",
                                default: false,
                            },
                            teleportSystem: {
                                type: "boolean",
                                default: false,
                            },
                            killstreaks: {
                                type: "object",
                                properties: {
                                    enabled: {
                                        type: "boolean",
                                        default: true,
                                    },
                                    countBotKills: {
                                        type: "boolean",
                                        default: false,
                                    },
                                },
                            },
                            automod: {
                                type: "boolean",
                                default: true,
                            },
                            punishments: {
                                type: "object",
                                properties: {
                                    shouldSave: {
                                        type: "boolean",
                                        default: true,
                                    },
                                    types: {
                                        type: "object",
                                        properties: {
                                            kicks: {
                                                type: "boolean",
                                                default: false,
                                            },
                                            bans: {
                                                type: "boolean",
                                                default: true,
                                            },
                                            unbans: {
                                                type: "boolean",
                                                default: true,
                                            },
                                            mutes: {
                                                type: "boolean",
                                                default: true,
                                            },
                                            unmutes: {
                                                type: "boolean",
                                                default: false,
                                            },
                                        },
                                        default: {
                                            kicks: false,
                                            bans: true,
                                            unbans: true,
                                            mutes: true,
                                            unmutes: false,
                                        },
                                    },
                                },
                                default: {
                                    shouldSave: true,
                                    types: {
                                        kicks: false,
                                        bans: true,
                                        unbans: true,
                                        mutes: true,
                                        unmutes: false,
                                    },
                                },
                            },
                            status: {
                                type: "object",
                                properties: {
                                    updateInterval: {
                                        type: "number",
                                        default: 5,
                                    },
                                    channel: {
                                        type: "string",
                                        default: "",
                                    },
                                    showPlayerList: {
                                        type: "boolean",
                                        default: false,
                                    },
                                    hideIPPort: {
                                        type: "boolean",
                                        default: false,
                                    },
                                    fallbackValues: {
                                        type: "object",
                                        properties: {
                                            serverName: {
                                                type: "string",
                                                default: "",
                                            },
                                            serverPort: {
                                                type: "number",
                                                default: 0,
                                            },
                                            maxPlayerCount: {
                                                type: "number",
                                                default: 0,
                                            },
                                            passwordProtected: {
                                                type: "boolean",
                                                default: false,
                                            },
                                        },
                                        default: {
                                            serverName: "",
                                            serverPort: 0,
                                            maxPlayerCount: 0,
                                            passwordProtected: false,
                                        },
                                    },
                                },
                                default: {
                                    updateInverval: 5,
                                    channel: "",
                                    showPlayerList: false,
                                    hideIPPort: false,
                                    fallbackValues: {
                                        serverName: "",
                                        serverPort: 0,
                                        maxPlayerCount: 0,
                                        passwordProtected: false,
                                    },
                                },
                            },
                            mapVote: {
                                type: "object",
                                properties: {
                                    enabled: {
                                        type: "boolean",
                                        default: true,
                                    },
                                    voteDuration: {
                                        type: "number",
                                        default: 30,
                                    },
                                    voteCooldown: {
                                        type: "number",
                                        default: 240,
                                    },
                                    voteThreshold: {
                                        type: "number",
                                        default: 0.6,
                                    },
                                    initialDelay: {
                                        type: "number",
                                        default: 30,
                                    },
                                    maps: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                shownName: {
                                                    type: "string",
                                                    minLength: 1,
                                                },
                                                map: {
                                                    type: "string",
                                                    minLength: 1,
                                                },
                                            },
                                        },
                                        minItems: 1,
                                        default: [
                                            {
                                                shownName: "Contraband",
                                                map: "ffa_contraband",
                                            },
                                        ],
                                    },
                                },
                            },
                            saveAdminActivity: {
                                type: "boolean",
                                default: true,
                            },
                            stats: {
                                type: "object",
                                properties: {
                                    adminActionWebhookChannel: {
                                        type: "string",
                                        default: "",
                                    },
                                    serverLagReportsWebhookChannel: {
                                        type: "string",
                                        default: "",
                                    },
                                },
                            },
                            logChannels: {
                                type: "object",
                                properties: {
                                    chat: {
                                        type: "string",
                                        default: "",
                                    },
                                    punishments: {
                                        type: "string",
                                        default: "",
                                    },
                                    activity: {
                                        type: "string",
                                        default: "",
                                    },
                                    wanted: {
                                        type: "string",
                                        default: "",
                                    },
                                    permanent: {
                                        type: "string",
                                        default: "",
                                    },
                                    automod: {
                                        type: "string",
                                        default: "",
                                    },
                                    killstreak: {
                                        type: "string",
                                        default: "",
                                    },
                                    adminCalls: {
                                        type: "string",
                                        default: "",
                                    },
                                    warns: {
                                        type: "string",
                                        default: "",
                                    },
                                },
                                default: {
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
                            },
                            ingameCommands: {
                                type: "array",
                                items: {
                                    enum: [
                                        "timeleft",
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
                                        "kill",
                                    ],
                                    default: [
                                        "timeleft",
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
                                        "kill",
                                    ],
                                },
                                uniqueItems: true,
                            },
                        },
                        default: {
                            host: "123.123.123.123",
                            port: 1234,
                            password: "password",
                            adminListSaving: true,
                            ignoreGlobalPunishments: false,
                            teleportSystem: false,
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
                            status: {
                                updateInterval: 5,
                                channel: "",
                                showPlayerList: false,
                                hideIPPort: false,
                                fallbackValues: {
                                    serverName: "",
                                    serverPort: 0,
                                    maxPlayerCount: 0,
                                    passwordProtected: false,
                                },
                            },
                            mapVote: {
                                enabled: true,
                                voteDuration: 30,
                                voteCooldown: 240,
                                voteThreshold: 0.6,
                                initialDelay: 30,
                                maps: [
                                    {
                                        shownName: "Contraband",
                                        map: "ffa_contraband",
                                    },
                                ],
                            },
                            saveAdminActivity: true,
                            stats: {
                                adminActionWebhookChannel: "",
                                serverLagReportsWebhookChannel: "",
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
                                "timeleft",
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
                                "kill",
                            ],
                        },
                        required: ["host", "port", "password"],
                    },
                },
                default: {
                    name: "Cool Server",
                    rcon: {
                        host: "123.123.123.123",
                        port: 1234,
                        password: "password",
                        adminListSaving: true,
                        ignoreGlobalPunishments: false,
                        teleportSystem: false,
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
                        status: {
                            updateInterval: 5,
                            channel: "",
                            showPlayerList: false,
                            hideIPPort: false,
                            fallbackValues: {
                                serverName: "",
                                serverPort: 0,
                                maxPlayerCount: 0,
                                passwordProtected: false,
                            },
                        },
                        mapVote: {
                            enabled: true,
                            voteDuration: 30,
                            voteCooldown: 240,
                            voteThreshold: 0.6,
                            initialDelay: 30,
                            maps: [
                                {
                                    shownName: "Contraband",
                                    map: "ffa_contraband",
                                },
                            ],
                        },
                        saveAdminActivity: true,
                        stats: {
                            adminActionWebhookChannel: "",
                            serverLagReportsWebhookChannel: "",
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
                            "timeleft",
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
                            "kill",
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
                    default: true,
                },
            },
            default: {
                rollbackAdmins: true,
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
            default: {
                "1": "{name} got first blood!",
                "5": "KILLING SPREE! {name} has a killstreak of {kills}!",
                "10": "RAMPAGE! {name} has a killstreak of {kills}!",
                "15": "DOMINATING! {name} has a killstreak of {kills}!",
                "20": "UNSTOPPABLE! {name} has a killstreak of {kills}!",
                "25": "GODLIKE! {name} has a killstreak of {kills}!",
                "30": "WICKED SICK! {name} has a killstreak of {kills}!",
            },
            minProperties: 1,
        },
        automod: {
            type: "object",
            properties: {
                infiniteDurationScaling: {
                    type: "boolean",
                    default: true,
                },
                adminsBypass: {
                    type: "boolean",
                    default: true,
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
                    default: {
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
                            message:
                                "Globally muted {name} for profane messages!",
                            duration: 1,
                        },
                        "6": {
                            type: "globalban",
                            message:
                                "Globally banned {name} for profane messages!",
                            duration: 1,
                            reason: "Sending profane messages (Profane words: {words})",
                        },
                    },
                    minProperties: 1,
                },
            },
            default: {
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
        },
        warns: {
            type: "object",
            properties: {
                infiniteDurationScaling: {
                    type: "boolean",
                    default: true,
                },
                resetAfterDuration: {
                    type: "number",
                    default: 43830,
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
                    default: {
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
                    minProperties: 1,
                },
            },
            default: {
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
        },
        discord: {
            type: "object",
            properties: {
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
                                        "admins",
                                        "ban",
                                        "banned",
                                        "chatlog",
                                        "teleportadd",
                                        "teleportremove",
                                        "teleportedit",
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
                                        "kill",
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
                    default: [
                        {
                            name: "Mods",
                            Ids: [""],
                            commands: [
                                "admins",
                                "ban",
                                "banned",
                                "chatlog",
                                "history",
                                "kick",
                                "mute",
                                "rename",
                                "kill",
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
                                "admins",
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
                                "kill",
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
                                "admins",
                                "teleportadd",
                                "teleportremove",
                                "teleportedit",
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
                                "kill",
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
                    minItems: 1,
                },
            },
            default: {
                roles: [
                    {
                        name: "Mods",
                        Ids: [""],
                        commands: [
                            "admins",
                            "ban",
                            "banned",
                            "chatlog",
                            "history",
                            "kick",
                            "mute",
                            "rename",
                            "kill",
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
                            "admins",
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
                            "kill",
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
                            "admins",
                            "teleportadd",
                            "teleportremove",
                            "teleportedit",
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
                            "kill",
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
            required: ["roles"],
        },
        mordhau: {
            type: "object",
            properties: {
                accountId: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
            },
            default: {
                accountId: "",
            },
            required: ["accountId"],
        },
        steam: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
            },
            default: {
                key: "",
            },
            required: ["key"],
        },
        database: {
            type: "object",
            properties: {
                host: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
                database: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
                username: {
                    type: "string",
                    minLength: 1,
                    default: "",
                },
                password: {
                    type: "string",
                    default: "",
                },
            },
            default: {
                host: "",
                database: "",
                username: "",
                password: "",
            },
            required: ["host", "database", "username", "password"],
        },
    },
    defaults: {
        ingamePrefix: "-",
        autoUpdate: {
            enabled: true,
            checkInterval: 30,
        },
        consoleTimezone: "",
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
                    teleportSystem: false,
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
                    status: {
                        updateInterval: 5,
                        channel: "",
                        showPlayerList: false,
                        hideIPPort: false,
                        fallbackValues: {
                            serverName: "",
                            serverPort: 0,
                            maxPlayerCount: 0,
                            passwordProtected: false,
                        },
                    },
                    mapVote: {
                        enabled: true,
                        voteDuration: 30,
                        voteCooldown: 240,
                        voteThreshold: 0.6,
                        initialDelay: 30,
                        maps: [
                            {
                                shownName: "Contraband",
                                map: "ffa_contraband",
                            },
                        ],
                    },
                    saveAdminActivity: true,
                    stats: {
                        adminActionWebhookChannel: "",
                        serverLagReportsWebhookChannel: "",
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
                        "timeleft",
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
                        "kill",
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
            roles: [
                {
                    name: "Mods",
                    Ids: [""],
                    commands: [
                        "admins",
                        "ban",
                        "banned",
                        "chatlog",
                        "history",
                        "kick",
                        "mute",
                        "rename",
                        "kill",
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
                        "admins",
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
                        "kill",
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
                        "admins",
                        "teleportadd",
                        "teleportremove",
                        "teleportedit",
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
                        "kill",
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
        // "1.9.0": (store) => {
        //     store.set("automod.infiniteDurationScaling", true);
        //     store.set("warns.infiniteDurationScaling", true);
        // },
        // "1.16.8": (store) => {
        //     const servers = store.get("servers");

        //     for (let i = 0; i < servers.length; i++) {
        //         store.set(`servers.${i}.rcon.status.fallbackValues`, {
        //             serverName: "",
        //             serverPort: 0,
        //             maxPlayerCount: 0,
        //         });
        //     }
        // },
        // "1.16.9": (store) => {
        //     const servers = store.get("servers");

        //     for (let i = 0; i < servers.length; i++) {
        //         store.set(
        //             `servers.${i}.rcon.status.fallbackValues.passwordProtected`,
        //             false
        //         );
        //     }
        // },
        // "1.19.0": (store) => {
        //     if (!store.get("consoleTimezone")) store.set("consoleTimezone", "");

        //     const servers = store.get("servers");

        //     for (let i = 0; i < servers.length; i++) {
        //         if (
        //             typeof store.get(`servers.${i}.rcon.saveAdminActivity`) !==
        //             "undefined"
        //         )
        //             continue;

        //         store.set(`servers.${i}.rcon.saveAdminActivity`, true);
        //     }
        // },
        "1.20.0": (store) => {
            // @ts-ignore
            store.delete("discord.guildId");
        },
    },
});
