"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.failedPunishmentsSchema = void 0;
const mongoose_1 = require("mongoose");
const mongoose_bignumber_1 = __importDefault(require("mongoose-bignumber"));
exports.failedPunishmentsSchema = new mongoose_1.Schema({
    server: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["ban", "mute", "unban", "unmute"],
    },
    duration: {
        type: mongoose_bignumber_1.default,
    },
    reason: {
        type: String,
    },
});
exports.default = mongoose_1.model("FailedPunishment", exports.failedPunishmentsSchema);
