import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { LoopState, SongData } from "./types";

const DELIMITER: string = ".|.";


export async function startMPRISProxy(): Promise<void> {
    return new Promise((resolve) => {
        console.log(`[mpris-proxy] Attempting to start mpris-proxy...`);

        const process: ChildProcessWithoutNullStreams = spawn('mpris-proxy');

        process.on('spawn', () => {
            console.log(`[mpris-proxy] Started mpris-proxy.`);
            resolve()
        })
        process.stdout.on("data", (data) => {
            console.log(`[mpris-proxy] ${data.toString().trim()}`);
            resolve()

        });

        process.stderr.on("data", (data) => {
            console.error(`[mpris-proxy] ${data.toString().trim()}`);
            resolve()

        });

        process.on("close", (code) => {
            console.error(`[mpris-proxy] Disconnected with code ${code}`);
            resolve()

        });
    })
}

export async function hasMediaPlayers(): Promise<boolean> {
    return new Promise((resolve) => {
        console.log(`[playerctl -l] Checking for listeners...`);
        const process: ChildProcessWithoutNullStreams = spawn('playerctl', ['-l']);

        process.stdout.on("data", (data) => {
            const devices: string = data.toString().trim();
            console.log(`[playerctl -l] ${data.toString().trim()}`);

            if (devices.toLowerCase().includes("No players found".toLowerCase())) {
                resolve(false);
                return
            }
            resolve(true)
        });
    })
}

export function listenToSongChanges(callback: (songData: SongData) => void) {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', [
        '--follow',
        'metadata',
        '--format',
        '{{ artist }}.|.{{ album }}.|.{{ title }}.|.{{ duration(position) }}.|.{{ duration(mpris:length) }}'
    ]);

    playerCTL.on('spawn', () => {
        console.log(`[playerctl metadata] Started listener.`);
    })

    playerCTL.stdout.on("data", (data) => {
        const songData: SongData = parseSongData(data.toString().trim());
        callback(songData);
    });

    playerCTL.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    playerCTL.on("close", (code) => {
        console.log(`[playerctl metadata] Exited with code ${code}`);
    });
}



export function listenToPlaybackState(callback: (isPlaying: boolean) => void) {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', ['status', '--follow']);
    playerCTL.on('spawn', () => {
        console.log(`[playerctl status] Started listener.`);
    })

    playerCTL.stdout.on("data", (data) => {
        callback(data.toString().trim() === "Playing");
    });

    playerCTL.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    playerCTL.on("close", (code) => {
        console.log(`[playerctl status] Exited with code ${code}`);
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
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, functionName.split(' '));

        playerCTL.on("close", () => {
            resolve();
        });
    })
}


export async function getLoopStatus(): Promise<LoopState> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, ['loop']);
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
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, ['shuffle']);
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