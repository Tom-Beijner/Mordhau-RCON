import fetch from "node-fetch";

export async function hastebin(input: string) {
    // if (!input) return console.error("No input specified");
    const res = await fetch("https://api.paste.gg/v1/pastes", {
        method: "POST",
        body: JSON.stringify({
            files: [
                {
                    content: {
                        format: "text",
                        value: input,
                    },
                },
            ],
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await res.json();
    return `https://paste.gg/p/anonymous/${json.result.id}`;
}
