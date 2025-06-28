import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { LoopState, ShuffleState, SongData } from "./types";

const FOLLOW_COMMAND: string = `playerctl --follow metadata --format '{{ artist }}.|.{{ album }}.|.{{ title }}.|.{{ duration(position) }}.|.{{ duration(mpris:length) }}`;
const DELIMITER: string = ".|.";

export function listenToSongChanges(callback: (songData: SongData) => void) {
    const playerCTL: ChildProcessWithoutNullStreams = spawn(FOLLOW_COMMAND);
    playerCTL.stdout.on("data", (data) => {
        const songData: SongData = parseSongData(data.toString().trim());
        callback(songData);
    });

    playerCTL.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    playerCTL.on("close", (code) => {
        console.log(`playerctl process exited with code ${code}`);
    });
}

export function listenToPlaybackState(callback: (isPlaying: boolean) => void) {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl status --follow');
    playerCTL.stdout.on("data", (data) => {
        callback(data.toString().trim() === "Playing");
    });

    playerCTL.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    playerCTL.on("close", (code) => {
        console.log(`playerctl process exited with code ${code}`);
    });
}

function parseSongData(songString: string): SongData {
    const split: string[] = songString.split(DELIMITER);
    return {
        artist: split[0],
        album: split[1],
        title: split[2],
        position: split[3],
        duration: split[4]
    }
}

export function togglePlay() {
    spawn("playerctl play-pause");
}

export function next() {
    spawn("playerctl next");
}

export function previous() {
    spawn("playerctl previous")
}

export function setPosition(positionSeconds: number) {
    spawn(`playerctl position ${positionSeconds}`);
}

export function setLoop(loop: LoopState) {
    spawn(`playerctl loop ${loop}`);
}

export function setShuffle(shuffle: ShuffleState) {
    spawn(`playerctl shuffle ${shuffle}`);
}


export async function getLoopStatus(): Promise<LoopState> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl loop`);
        playerCTL.stdout.on("data", (data) => {
            resolve(data.toString().trim());
            playerCTL.kill();
        });

        playerCTL.stderr.on("data", (data) => {
            resolve(null);
            console.error(`Error: ${data}`);
        });
    })
}

export async function getShuffleStatus(): Promise<ShuffleState> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl shuffle`);
        playerCTL.stdout.on("data", (data) => {
            resolve(data.toString().trim());
            playerCTL.kill();
        });

        playerCTL.stderr.on("data", (data) => {
            resolve(null);
            console.error(`Error: ${data}`);
        });
    })
}