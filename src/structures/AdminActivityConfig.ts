import Conf from "conf";

export interface AdminActivityConfig {
    admins: {
        [id: string]: Admin;
    };
}

export interface Admin {
    name: string;
    servers: {
        [name: string]: Server;
    };
}

export interface Server {
    activity: {
        [date: string]: Activity;
    };
}

export interface Activity {
    startedAt: number;
    duration: number;
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

export default new Conf<AdminActivityConfig>({
    configName: "adminActivity",
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
                    servers: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                activity: {
                                    type: "object",
                                    additionalProperties: {
                                        type: "object",
                                        properties: {
                                            startedAt: {
                                                type: "number",
                                            },
                                            duration: {
                                                type: "number",
                                                minimum: 0,
                                            },
                                        },
                                    },
                                },
                            },
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
