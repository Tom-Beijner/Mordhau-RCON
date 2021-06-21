import config from "../config.json";

export function redact(code: string) {
    const tokens = [
        config.bot.token,
        config.database.host,
        config.database.username,
        config.database.password.replace("*", "\\*").replace("^", "\\^"),
    ];

    const regex = new RegExp(tokens.join("|"), "gi");
    return code.replace(regex, "|REDACTED|");
}
