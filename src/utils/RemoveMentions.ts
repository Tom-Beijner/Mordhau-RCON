/**
 * Breaks user, role and everyone/here mentions by adding a zero width space after every @ character
 * @param {string} str The string to sanitize
 * @returns {string}
 */
export default function removeMentions(str: string): string {
    return str ? str.replace(/@/g, "@\u200b") : str;
}
