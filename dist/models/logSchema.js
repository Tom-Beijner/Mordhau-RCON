"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSchema = void 0;
const mongoose_1 = require("mongoose");
const mongoose_bignumber_1 = __importDefault(require("mongoose-bignumber"));
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
        type: mongoose_bignumber_1.default,
        required: false,
    },
});
exports.default = mongoose_1.model("Log", exports.logSchema);
