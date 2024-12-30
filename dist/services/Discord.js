"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentConfirmation = exports.mentionRole = exports.sendWebhookEmbed = exports.sendWebhookMessage = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const slash_create_1 = require("slash-create");
async function sendWebhookMessage(webhookCredentials, content, options = {}, files) {
    if (!webhookCredentials)
        return "Webhook endpoint not provided";
    const body = {
        content,
        allowed_mentions: {
            parse: [],
            ...options,
        },
    };
    if (files && files.length > 0) {
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
        const bodyParts = [];
        bodyParts.push(`--${boundary}`);
        bodyParts.push(`Content-Disposition: form-data; name="payload_json"\r\n\r\n`);
        bodyParts.push(JSON.stringify(body));
        bodyParts.push("\r\n");
        for (const file of files) {
            bodyParts.push(`--${boundary}`);
            bodyParts.push(`Content-Disposition: form-data; name="files[]"; filename="${file.name}"\r\n`);
            bodyParts.push("Content-Type: application/octet-stream\r\n\r\n");
            bodyParts.push(file.attachment);
            bodyParts.push("\r\n");
        }
        bodyParts.push(`--${boundary}--\r\n`);
        const multipartBody = Buffer.concat(bodyParts.map((part) => typeof part === "string" ? Buffer.from(part, "utf-8") : part));
        body.multipartBody = multipartBody;
        body.boundary = boundary;
    }
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
    const headers = {};
    let requestBody;
    if (content.multipartBody) {
        requestBody = content.multipartBody;
        headers["Content-Type"] = `multipart/form-data; boundary=${content.boundary}`;
    }
    else {
        requestBody = JSON.stringify(content);
        headers["Content-Type"] = "application/json";
    }
    return node_fetch_1.default(`https://discord.com/api/webhooks/${webhookCredentials.id}/${webhookCredentials.token}`, {
        method: "POST",
        body: requestBody,
        headers,
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
