"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failedPunishmentsSchema = void 0;
const mongoose_1 = require("mongoose");
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
        type: Number,
    },
    reason: {
        type: String,
    },
});
exports.default = mongoose_1.model("FailedPunishment", exports.failedPunishmentsSchema);
