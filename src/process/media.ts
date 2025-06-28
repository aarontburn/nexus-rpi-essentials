import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { LoopState, SongData } from "./types";

const FOLLOW_COMMAND: string = `playerctl --follow metadata --format '{{ artist }}.|.{{ album }}.|.{{ title }}.|.{{ duration(position) }}.|.{{ duration(mpris:length) }}`;
const DELIMITER: string = ".|.";


export function startMPRISProxy() {
    const process: ChildProcessWithoutNullStreams = spawn('mpris-proxy');

    process.stdout.on("data", (data) => {
        console.log(`[mpris-proxy]: ${data.toString().trim()}`);
    });

    process.stderr.on("data", (data) => {
        console.error(`[mpris-proxy]: ${data.toString().trim()}`);

    });

    process.on("close", (code) => {
        console.error(`[mpris-proxy]: DISCONNECTED`);
    });
}

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

export async function togglePlay(): Promise<void> {
    return executePlayerCTLFunction('play-pause');

}

export async function next(): Promise<void> {
    return executePlayerCTLFunction('next');
}

export function previous(): Promise<void> {
    return executePlayerCTLFunction('previous');
}

export function setPosition(positionSeconds: number) {
    return executePlayerCTLFunction(`position ${positionSeconds}`);
}

export function setLoop(loop: LoopState) {
    return executePlayerCTLFunction(`loop ${loop}`);
}

export function toggleShuffle() {
    return executePlayerCTLFunction(`shuffle toggle`);
}

async function executePlayerCTLFunction(functionName: string): Promise<void> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl ${functionName}`);

        playerCTL.on("close", () => {
            resolve();
        });
    })
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

export async function getShuffleStatus(): Promise<boolean> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl shuffle`);
        playerCTL.stdout.on("data", (data) => {
            resolve(data.toString().trim() === "On");
            playerCTL.kill();
        });

        playerCTL.stderr.on("data", (data) => {
            resolve(null);
            console.error(`Error: ${data}`);
        });
    })
}