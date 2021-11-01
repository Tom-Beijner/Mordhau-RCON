"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSplitter = void 0;
const stream_1 = require("stream");
function createSplitter() {
    let transform = new stream_1.Transform();
    let buffer = Buffer.alloc(0);
    transform._transform = (chunk, _encoding, callback) => {
        buffer = Buffer.concat([buffer, chunk]);
        let offset = 0;
        while (offset + 4 < buffer.length) {
            const length = buffer.readInt32LE(offset);
            if (offset + 4 + length > buffer.length)
                break;
            transform.push(buffer.slice(offset, offset + 4 + length));
            offset += 4 + length;
        }
        buffer = buffer.slice(offset);
        callback();
    };
    return transform;
}
exports.createSplitter = createSplitter;
