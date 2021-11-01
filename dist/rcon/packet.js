"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacketType = exports.decodePacket = exports.encodePacket = void 0;
function encodePacket(packet) {
    const buffer = Buffer.alloc(packet.payload.length + 14);
    buffer.writeInt32LE(packet.payload.length + 10, 0);
    buffer.writeInt32LE(packet.id, 4);
    buffer.writeInt32LE(packet.type, 8);
    packet.payload.copy(buffer, 12);
    return buffer;
}
exports.encodePacket = encodePacket;
function decodePacket(buffer) {
    const length = buffer.readInt32LE(0);
    const id = buffer.readInt32LE(4);
    const type = buffer.readInt32LE(8);
    const payload = buffer.slice(12, length + 2);
    return {
        id,
        type,
        payload,
    };
}
exports.decodePacket = decodePacket;
var PacketType;
(function (PacketType) {
    PacketType[PacketType["Auth"] = 3] = "Auth";
    PacketType[PacketType["AuthResponse"] = 2] = "AuthResponse";
    PacketType[PacketType["Command"] = 2] = "Command";
    PacketType[PacketType["CommandResponse"] = 0] = "CommandResponse";
    PacketType[PacketType["Broadcast"] = 54325] = "Broadcast";
})(PacketType = exports.PacketType || (exports.PacketType = {}));
