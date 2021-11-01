"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function removeMentions(str) {
    return str ? str.replace(/@/g, "@\u200b") : str;
}
exports.default = removeMentions;
