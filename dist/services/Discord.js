"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentConfirmation = exports.mentionRole = exports.sendWebhookEmbed = exports.sendWebhookMessage = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const slash_create_1 = require("slash-create");
const parseOut_1 = __importDefault(require("../utils/parseOut"));
async function sendWebhookMessage(webhookCredentials, content) {
    if (!webhookCredentials)
        return "Webhook endpoint not provided";
    const body = {
        content: parseOut_1.default(content),
        allowed_mentions: {
            parse: [],
        },
    };
    return await send(webhookCredentials, body);
}
exports.sendWebhookMessage = sendWebhookMessage;
async function sendWebhookEmbed(webhookCredentials, embed) {
    if (!webhookCredentials)
        return "Webhook endpoint not provided";
    const body = {
        embeds: [embed],
        allowed_mentions: {
            parse: [],
        },
    };
    return await send(webhookCredentials, body);
}
exports.sendWebhookEmbed = sendWebhookEmbed;
function send(webhookCredentials, content) {
    return node_fetch_1.default(`https://discord.com/api/webhooks/${webhookCredentials.id}/${webhookCredentials.token}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(content),
    });
}
function mentionRole(id) {
    return `<@&${id}>`;
}
exports.mentionRole = mentionRole;
async function ComponentConfirmation(ctx, message, confirm, cancel) {
    await ctx.send({
        ...message,
        components: [
            {
                type: slash_create_1.ComponentType.ACTION_ROW,
                components: [
                    {
                        type: slash_create_1.ComponentType.BUTTON,
                        style: slash_create_1.ButtonStyle.SUCCESS,
                        custom_id: "confirm",
                        label: "Confirm",
                    },
                    {
                        type: slash_create_1.ComponentType.BUTTON,
                        style: slash_create_1.ButtonStyle.DESTRUCTIVE,
                        custom_id: "cancel",
                        label: "Cancel",
                    },
                ],
            },
        ],
    });
    ctx.registerComponent("confirm", confirm);
    ctx.registerComponent("cancel", cancel
        ? cancel
        : async (btnCtx) => {
            if (ctx.user.id !== btnCtx.user.id)
                return;
            await btnCtx.editParent({
                content: "Cancelled!",
                embeds: [],
                components: [],
            });
        });
}
exports.ComponentConfirmation = ComponentConfirmation;
