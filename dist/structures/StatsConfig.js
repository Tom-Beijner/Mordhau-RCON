"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conf_1 = __importDefault(require("conf"));
exports.default = new conf_1.default({
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
