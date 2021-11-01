"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.warnsSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
    },
    infractions: {
        type: Number,
        required: true,
        min: 0,
    },
    expirationDate: {
        type: Date,
        expires: 0,
    },
});
exports.default = mongoose_1.model("Warns", exports.warnsSchema);
