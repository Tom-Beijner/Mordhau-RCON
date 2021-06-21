import fetch from "node-fetch";
import { Embed } from "../structures/DiscordEmbed";

export async function sendWebhookMessage(
    webhookEndpoint: string,
    content: string
) {
    if (!webhookEndpoint) return "Webhook endpoint not provided";

    const body = {
        content,
    };

    return await send(webhookEndpoint, body);
}

export async function sendWebhookEmbed(webhookEndpoint: string, embed: Embed) {
    if (!webhookEndpoint) return "Webhook endpoint not provided";

    const body = {
        embeds: [embed],
    };

    return await send(webhookEndpoint, body);
}

function send(webhookEndpoint: string, content: any) {
    return fetch(webhookEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(content),
    });
}

export function mentionRole(id: string) {
    return `<@&${id}>`;
}
