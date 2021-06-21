export type Footer = {
    text: string;
    icon_url?: string;
};

export type Thumbnail = {
    url?: string;
};

export type Image = {
    url?: string;
};

export type Author = {
    name: string;
    url?: string;
    icon_url?: string;
};

export type Field = {
    name: string;
    value: string;
    inline?: boolean;
};

export type Embed = {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    timestamp?: string;
    footer?: Footer;
    thumbnail?: Thumbnail;
    image?: Image;
    author?: Author;
    fields?: Field[];
};

/**
 * Creates a embedded message
 *
 * @class DiscordEmbed
 */
export default class DiscordEmbed {
    private _embed: Embed = {};

    /**
     * @param { string } title Title
     */
    public setTitle(title: string) {
        this._embed.title = title;
        return this;
    }

    /**
     * @param { string } description Description
     */
    public setDescription(description: string) {
        this._embed.description = description;
        return this;
    }

    /**
     * @param { string } url URL
     */
    public setUrl(url: string) {
        this._embed.url = url;
        return this;
    }

    /**
     * @param { string } color Color of embed. Color is an RGB Int
     */
    public setColor(color: number) {
        this._embed.color = color;
        return this;
    }

    /**
     * @param { Date } timestamp Timestamp of embed
     */
    public setTimestamp(timestamp: Date) {
        this._embed.timestamp = timestamp.toISOString();
        return this;
    }

    /**
     * @param { string } text Footer text
     * @param { string } icon_url (Optional) Footer
     */
    public setFooter(text: string, icon_url?: string) {
        const footer: Footer = {
            text,
        };
        if (icon_url) {
            footer.icon_url = icon_url;
        }
        this._embed.footer = footer;
        return this;
    }

    /**
     * @param { string } url Thumbnail URL
     */
    public setThumbnail(url: string) {
        this._embed.thumbnail = {
            url,
        };
        return this;
    }

    /**
     * @param { string } url Image URL
     */
    public setImage(url: string) {
        this._embed.image = {
            url,
        };
        return this;
    }

    /**
     * @param { string } name Author Name
     * @param { string } url (Optional) Author URL
     * @param { string } icon_url (Optional) Author Icon
     */
    public setAuthor(name: string, url?: string, icon_url?: string) {
        const author: Author = {
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

    /**
     * @param { string } name Name of field
     * @param { string } value Value of field
     * @param { boolean } [ inline ] (Optional) Whether the field is inline or not
     */
    public addField(name: string, value: string, inline?: boolean) {
        if (!this._embed.fields) {
            this._embed.fields = [];
        }
        const newField: Field = {
            name,
            value,
        };

        if (inline) {
            newField.inline = inline;
        }

        this._embed.fields.push(newField);
        return this;
    }

    /**
     * get the Embed object
     *
     * @returns { Embed } A JSON Embed object
     */
    public getEmbed() {
        return this._embed;
    }
}
