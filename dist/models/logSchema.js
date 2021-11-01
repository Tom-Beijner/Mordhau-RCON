"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSchema = void 0;
const mongoose_1 = require("mongoose");
const subSchema = new mongoose_1.Schema({
    platform: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: false,
    },
});
exports.logSchema = new mongoose_1.Schema({
    ids: [subSchema],
    id: {
        type: String,
        required: true,
    },
    player: {
        type: String,
        required: false,
    },
    server: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    date: {
        type: Number,
        required: true,
    },
    admin: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
    },
    duration: {
        type: Number,
        required: false,
    },
});
exports.default = mongoose_1.model("Log", exports.logSchema);
