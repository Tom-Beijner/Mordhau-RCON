import Timer from "easytimer.js";
import Rcon from "./Rcon";

export default class MapVote {
    private rcon: Rcon;
    public timer: Timer = new Timer({ countdown: true });
    public votes: number = 0;
    public voted: { id: string; map: number }[] = [];
    public requiredVotes: number;

    constructor(rcon: Rcon) {
        this.rcon = rcon;
    }

    public vote(
        mapNumber: number,
        player: {
            ids: { playFabID: string; steamID: string };
            id: string;
            name?: string;
        }
    ) {
        if (!this.timer.isRunning) {
            this.votes++;

            this.rcon.say(
                `[Map Vote] RTV requested by ${player.name} (${this.votes}/${this.requiredVotes})`
            );
        }

        if (this.votes >= this.requiredVotes && !this.timer.isRunning) {
            this.rcon.say(`[Map Vote] Starting map vote\n`);

            this.timer.start({ countdown: true, startValues: { seconds: 10 } });

            return;
        }

        this.voted.push({ id: player.id, map: mapNumber });
    }

    public removeVote(player: {
        ids: { playFabID: string; steamID: string };
        id: string;
    }) {
        if (this.voted.find((vote) => vote.id === player.id)) {
            this.votes--;
            this.voted = this.voted.filter((vote) => vote.id !== player.id);
        }
    }

    public cancel() {
        if (!this.timer.isRunning) {
            this.rcon.say("[Map Vote] Map vote is not running");
        }

        this.timer.stop();

        this.rcon.say("[Map Vote] Map vote has been cancelled");
    }

    public clear() {
        this.votes = 0;
        this.voted = [];
        this.timer.stop();
    }
}
