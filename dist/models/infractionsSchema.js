"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.infractionsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.infractionsSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
    },
    infractions: {
        type: Number,
        required: true,
        min: 0,
    },
    words: [
        [
            {
                type: String,
                required: true,
            },
        ],
    ],
});
exports.default = mongoose_1.model("Infraction", exports.infractionsSchema);
