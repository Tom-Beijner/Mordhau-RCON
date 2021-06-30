import config from "../structures/Config";

export function redact(code: string) {
    const tokens = [
        config.get("bot.token"),
        config.get("steam.key"),
        config.get("database.host"),
        config.get("database.username"),
        (config.get("database.password") as string)
            .replace("*", "\\*")
            .replace("^", "\\^"),
        ...config.get("servers").map((server) => server.rcon.password),
    ];

    const regex = new RegExp(tokens.join("|"), "gi");
    return code.replace(regex, "|REDACTED|");
}
