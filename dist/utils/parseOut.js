"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const remove_markdown_1 = __importDefault(require("remove-markdown"));
function parseOut(string) {
    return remove_markdown_1.default(string.replace(/\//g, "\\/"));
}
exports.default = parseOut;
