import Conf from "conf";

export interface StatsConfig {
    admins: {
        [date: string]: Admin;
    };
}

export interface Admin {
    name: string;
    servers: Server;
}

export interface Server {
    adminActions: AdminActions;
}

export interface AdminActions {
    [date: string]: {
        [action: string]: number;
    };
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

export default new Conf<StatsConfig>({
    configName: "stats",
    cwd: "./",
    accessPropertiesByDotNotation: true,
    schema: {
        admins: {
            type: "object",
            additionalProperties: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                    },
                    adminActions: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                        },
                    },
                },
            },
        },
    },
    defaults: {
        admins: {},
    },
});
