import Conf from "conf";

export interface TeleportConfig {
    maps: {
        [name: string]: Map;
    };
}

export interface Map {
    locations: {
        [name: string]: Location;
    };
}

export interface Location {
    aliases?: string[];
    coordinates: Coordinates;
}

export interface Coordinates {
    x: number;
    y: number;
    z: number;
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

export default new Conf<TeleportConfig>({
    configName: "teleportLocations",
    cwd: "./",
    accessPropertiesByDotNotation: true,
    schema: {
        maps: {
            type: "object",
            additionalProperties: {
                type: "object",
                properties: {
                    locations: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                aliases: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                    },
                                },
                                coordinates: {
                                    type: "object",
                                    properties: {
                                        x: {
                                            type: "number",
                                        },
                                        y: {
                                            type: "number",
                                        },
                                        z: {
                                            type: "number",
                                        },
                                    },
                                    required: ["x", "y", "z"],
                                },
                            },
                            required: ["coordinates"],
                        },
                    },
                },
                required: ["locations"],
            },
        },
    },
    defaults: {
        maps: {
            ffa_test_map: {
                locations: {
                    center: {
                        aliases: ["thisIsALie"],
                        coordinates: { x: 0, y: 0, z: 0 },
                    },
                },
            },
        },
    },
});
