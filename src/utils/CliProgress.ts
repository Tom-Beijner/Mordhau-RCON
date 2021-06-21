import cliProgress, { MultiBar, SingleBar } from "cli-progress";

export function singleBar(type: string): SingleBar {
    return new cliProgress.SingleBar({
        // barIncompleteChar: "\u2591",
        // barCompleteChar: "\u2588",
        noTTYOutput: true,
        stream: process.stdout,
        format: `${type} | \x1b[36m{bar}\x1b[0m | {percentage}% | {value}/{total} | {name}`,
    });
}
export function multiBar(type: string): MultiBar {
    return new cliProgress.MultiBar({
        // barIncompleteChar: "\u2591",
        // barCompleteChar: "\u2588",
        noTTYOutput: true,
        stream: process.stdout,
        format: `${type} | \x1b[36m{bar}\x1b[0m | {percentage}% | {value}/{total} | {name}`,
    });
}
