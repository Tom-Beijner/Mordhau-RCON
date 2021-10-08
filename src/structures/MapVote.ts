import Timer from "easytimer.js";
import config, { MapVote as IMapVote } from "./Config";
import Rcon from "./Rcon";

export default class MapVote {
    private rcon: Rcon;
    public timer: Timer;
    public voteBlocked: boolean = false;
    public voteBlockedSince: number;
    public voteBlockedDuration: number;
    public votes: number = 0;
    public voted: { id: string; map: number }[] = [];
    options: IMapVote;

    constructor(rcon: Rcon) {
        this.rcon = rcon;
        this.options = config
            .get("servers")
            .find((s) => s.name === rcon.options.name).rcon.mapVote;
        this.timer = new Timer({ countdown: true });
        this.timer.on("secondsUpdated", (e) => {
            const time = e.detail.timer.getTimeValues().seconds;

            if (time % 5 === 0 && time !== 0) {
                this.rcon.say(`[Map Vote] ${time} seconds remaining to vote`);
            }
        });
        this.timer.on("targetAchieved", () => {
            // this.rcon.say(`[Map Vote] Voting has ended`);

            if (this.voted.length < this.options.voteThreshold) {
                this.clear();
                this.voteBlocked = true;
                this.voteBlockedSince = Date.now();
                this.voteBlockedDuration = this.options.voteCooldown;

                this.rcon.say(
                    `[Map Vote] Voting has been cancelled due to not reaching the required amount of votes`
                );

                setTimeout(() => {
                    this.voteBlocked = false;

                    this.rcon.say(`[Map Vote] Voting has been re-enabled`);
                }, this.options.voteCooldown * 1000);

                return;
            }

            const { map, votes } = this.voted.reduce(
                (acc, vote) => {
                    if (
                        acc.votes <
                        this.voted.filter((v) => v.map === vote.map).length
                    ) {
                        acc.map = vote.map;
                        acc.votes = this.voted.filter(
                            (v) => v.map === vote.map
                        ).length;
                    }

                    return acc;
                },
                { map: 0, votes: 0 }
            );

            this.rcon.say(
                `[Map Vote] Map ${this.options.maps[map].shownName} (${votes}/${this.voted.length}) has been selected`
            );

            this.rcon.changeMap(this.options.maps[map].map);

            this.clear();
        });
    }

    public async vote(
        mapNumber: number,
        player: {
            ids: { playFabID: string; steamID?: string };
            id: string;
            name?: string;
        }
    ) {
        if (!this.options.enabled) {
            return;
        }

        if (this.voteBlocked && this.voteBlockedSince === null) {
            this.rcon.say(`[Map Vote] Waiting for the match to start`);

            return;
        }

        if (this.voteBlocked) {
            const time = Math.floor(
                (this.voteBlockedDuration * 1000 -
                    (Date.now() - this.voteBlockedSince)) /
                    1000
            );

            this.rcon.say(
                `[Map Vote] Voting has been blocked for ${time} seconds`
            );

            return;
        }

        const requiredVotes = Math.ceil(
            this.options.voteThreshold *
                (await this.rcon.getIngamePlayers()).length
        );

        if (!this.timer.isRunning()) {
            this.votes++;

            this.rcon.say(
                `[Map Vote] Map voting requested by ${player.name} (${this.votes}/${requiredVotes})`
            );
        }

        if (this.votes >= requiredVotes && !this.timer.isRunning()) {
            this.rcon.say(
                `[Map Vote] Starting map vote. Map list:\n${this.options.maps
                    .map((m, i) => `${i + 1}. ${m.shownName}`)
                    .join("\n")}\n\nVoting ends in ${
                    this.options.voteDuration
                } seconds, to vote use: ${config.get(
                    "ingamePrefix"
                )}votemap [map number]`
            );

            this.timer.start({
                countdown: true,
                startValues: { seconds: this.options.voteDuration },
            });

            return;
        }

        if (this.timer.isRunning()) {
            if (isNaN(mapNumber)) {
                this.rcon.say(
                    `[Map Vote] Invalid map number. Use: ${config.get(
                        "ingamePrefix"
                    )}votemap [map number]`
                );

                return;
            }

            if (!this.options.maps[mapNumber - 1]) {
                this.rcon.say(
                    `[Map Vote] Map ${mapNumber} does not exist in the list of maps.`
                );
                return;
            }

            this.voted = this.voted.filter((vote) => vote.id !== player.id);
            this.voted.push({ id: player.id, map: mapNumber - 1 });

            this.rcon.say(
                `[Map Vote] ${player.name} voted for ${
                    this.options.maps[mapNumber - 1].shownName
                } (${this.voted.length}/${requiredVotes})`
            );
        }
    }

    onMatchEnd() {
        this.voteBlocked = true;
        this.voteBlockedSince = null;

        this.clear();
    }

    public onMatchStart() {
        this.clear();

        this.voteBlockedSince = Date.now();

        this.rcon.say(
            `[Map Vote] Map voting will be enabled in ${this.options.initialDelay} seconds`
        );

        this.voteBlockedDuration = this.options.initialDelay;

        setTimeout(() => {
            this.voteBlocked = false;

            this.rcon.say(
                `[Map Vote] Map voting has been enabled, use ${config.get(
                    "ingamePrefix"
                )}votemap`
            );
        }, this.options.initialDelay * 1000);
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
        if (!this.timer.isRunning()) {
            this.rcon.say("[Map Vote] Map vote is not running");

            return;
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
