"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DiscordEmbed {
    constructor() {
        this._embed = {};
    }
    setTitle(title) {
        this._embed.title = title;
        return this;
    }
    setDescription(description) {
        this._embed.description = description;
        return this;
    }
    setUrl(url) {
        this._embed.url = url;
        return this;
    }
    setColor(color) {
        this._embed.color = color;
        return this;
    }
    setTimestamp(timestamp) {
        this._embed.timestamp = timestamp.toISOString();
        return this;
    }
    setFooter(text, icon_url) {
        const footer = {
            text,
        };
        if (icon_url) {
            footer.icon_url = icon_url;
        }
        this._embed.footer = footer;
        return this;
    }
    setThumbnail(url) {
        this._embed.thumbnail = {
            url,
        };
        return this;
    }
    setImage(url) {
        this._embed.image = {
            url,
        };
        return this;
    }
    setAuthor(name, url, icon_url) {
        const author = {
            name,
        };
        if (url) {
            author.url = url;
        }
        if (icon_url) {
            author.icon_url = icon_url;
        }
        this._embed.author = author;
        return this;
    }
    addField(name, value, inline) {
        if (!this._embed.fields) {
            this._embed.fields = [];
        }
        const newField = {
            name,
            value,
        };
        if (inline) {
            newField.inline = inline;
        }
        this._embed.fields.push(newField);
        return this;
    }
    getEmbed() {
        return this._embed;
    }
}
exports.default = DiscordEmbed;
