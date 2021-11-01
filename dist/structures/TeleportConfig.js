"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conf_1 = __importDefault(require("conf"));
exports.default = new conf_1.default({
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
