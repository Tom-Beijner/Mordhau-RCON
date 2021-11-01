"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hastebin = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function hastebin(input) {
    const res = await node_fetch_1.default("https://api.paste.gg/v1/pastes", {
        method: "POST",
        body: JSON.stringify({
            files: [
                {
                    content: {
                        format: "text",
                        value: input,
                    },
                },
            ],
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await res.json();
    return `https://paste.gg/p/anonymous/${json.result.id}`;
}
exports.hastebin = hastebin;
