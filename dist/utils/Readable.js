"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readable = void 0;
function readable(ms) {
    const weeks = Math.floor(ms / 1000 / 60 / 60 / 24 / 7);
    ms -= weeks * 1000 * 60 * 60 * 24 * 7;
    const days = Math.floor(ms / 1000 / 60 / 60 / 24);
    ms -= days * 1000 * 60 * 60 * 24;
    const hours = Math.floor(ms / 1000 / 60 / 60);
    ms -= hours * 1000 * 60 * 60;
    const mins = Math.floor(ms / 1000 / 60);
    ms -= mins * 1000 * 60;
    const sec = Math.floor(ms / 1000);
    let readable = "";
    if (weeks > 0)
        readable += `${weeks}w`;
    if (days > 0)
        readable += `${days}d`;
    if (hours > 0)
        readable += `${hours}h`;
    if (mins > 0)
        readable += `${mins}m`;
    if (sec > 0)
        readable += `${sec}s`;
    return readable;
}
exports.readable = readable;
