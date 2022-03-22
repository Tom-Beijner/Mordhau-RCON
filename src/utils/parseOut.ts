import removeMarkdown from "remove-markdown";

export default function parseOut(string: string) {
    return removeMarkdown(string.replace(/\//g, "\\/"));
}
