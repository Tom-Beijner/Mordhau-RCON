import fetch from "node-fetch";
import {
    ButtonStyle,
    ComponentContext,
    ComponentType,
    MessageInteractionContext,
    MessageOptions,
} from "slash-create";

import { Embed } from "../structures/DiscordEmbed";

// Cant get type from slash-create so made a hack
type ComponentRegisterCallback = (ctx: ComponentContext) => void;

export async function sendWebhookMessage(
    webhookCredentials: { id: string; token: string },
    content: string,
    options: object = {},
    files?: { attachment: Buffer, name: string }[]
) {
    if (!webhookCredentials) return "Webhook endpoint not provided";

    const body: any = {
        content,
        allowed_mentions: {
            parse: [],
            ...options,
        },
    };

    // If there are files, construct a multipart/form-data payload
    if (files && files.length > 0) {
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
        const bodyParts: (Buffer | string)[] = [];

        // Add the JSON payload as a form field
        bodyParts.push(`--${boundary}`);
        bodyParts.push(`Content-Disposition: form-data; name="payload_json"\r\n\r\n`);
        bodyParts.push(JSON.stringify(body));
        bodyParts.push("\r\n");

        // Add file attachments
        for (const file of files) {
            bodyParts.push(`--${boundary}`);
            bodyParts.push(
                `Content-Disposition: form-data; name="files[]"; filename="${file.name}"\r\n`
            );
            bodyParts.push("Content-Type: application/octet-stream\r\n\r\n");
            bodyParts.push(file.attachment);
            bodyParts.push("\r\n");
        }

        // End the boundary
        bodyParts.push(`--${boundary}--\r\n`);

        // Combine all parts into a single Buffer
        const multipartBody = Buffer.concat(
            bodyParts.map((part) =>
                typeof part === "string" ? Buffer.from(part, "utf-8") : part
            )
        );

        // Replace the body with the multipart payload and set headers
        body.multipartBody = multipartBody;
        body.boundary = boundary;
    }

    return await send(webhookCredentials, body);
}

export async function sendWebhookEmbed(
    webhookCredentials: { id: string; token: string },
    embed: Embed
) {
    if (!webhookCredentials) return "Webhook endpoint not provided";

    const body = {
        embeds: [embed],
        allowed_mentions: {
            parse: [],
        },
    };

    return await send(webhookCredentials, body);
}

function send(webhookCredentials: { id: string; token: string }, content: any) {
    const headers: Record<string, string> = {};

    let requestBody: any;
    if (content.multipartBody) {
        // Handle multipart/form-data
        requestBody = content.multipartBody;
        headers["Content-Type"] = `multipart/form-data; boundary=${content.boundary}`;
    } else {
        // Handle JSON payload
        requestBody = JSON.stringify(content);
        headers["Content-Type"] = "application/json";
    }

    return fetch(
        `https://discord.com/api/webhooks/${webhookCredentials.id}/${webhookCredentials.token}`,
        {
            method: "POST",
            body: requestBody,
            headers,
        }
    );
}

export function mentionRole(id: string) {
    return `<@&${id}>`;
}

export async function ComponentConfirmation(
    ctx: MessageInteractionContext,
    message: MessageOptions,
    confirm: ComponentRegisterCallback,
    cancel?: ComponentRegisterCallback
) {
    await ctx.send({
        ...message,
        components: [
            {
                type: ComponentType.ACTION_ROW,
                components: [
                    {
                        type: ComponentType.BUTTON,
                        style: ButtonStyle.SUCCESS,
                        custom_id: "confirm",
                        label: "Confirm",
                        // emoji: {
                        //     name: "✅",
                        // },
                    },
                    {
                        type: ComponentType.BUTTON,
                        style: ButtonStyle.DESTRUCTIVE,
                        custom_id: "cancel",
                        label: "Cancel",
                        // emoji: { name: "❌" },
                    },
                ],
            },
        ],
    });

    ctx.registerComponent("confirm", confirm);

    ctx.registerComponent(
        "cancel",
        cancel
            ? cancel
            : async (btnCtx) => {
                if (ctx.user.id !== btnCtx.user.id) return;

                await btnCtx.editParent({
                    content: "Cancelled!",
                    embeds: [],
                    components: [],
                });
            }
    );
}
