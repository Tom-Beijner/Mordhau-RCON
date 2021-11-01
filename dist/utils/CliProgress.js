"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiBar = exports.singleBar = void 0;
const cli_progress_1 = __importDefault(require("cli-progress"));
function singleBar(type) {
    return new cli_progress_1.default.SingleBar({
        noTTYOutput: true,
        stream: process.stdout,
        format: `${type} | \x1b[36m{bar}\x1b[0m | {percentage}% | {value}/{total} | {name}`,
    });
}
exports.singleBar = singleBar;
function multiBar(type) {
    return new cli_progress_1.default.MultiBar({
        noTTYOutput: true,
        stream: process.stdout,
        format: `${type} | \x1b[36m{bar}\x1b[0m | {percentage}% | {value}/{total} | {name}`,
    });
}
exports.multiBar = multiBar;
