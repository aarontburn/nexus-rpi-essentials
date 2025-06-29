import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { LoopState, SongData } from "./types";

const DELIMITER: string = ".|.";

const createdProcesses: ChildProcessWithoutNullStreams[] = []


export function cleanupProcesses() {
    createdProcesses.forEach(proc => {
        try {
            proc.kill();
        } catch (e) {
            console.error('Failed to kill process:', e);
        }
    });
}

export async function startMPRISProxy(): Promise<void> {
    return new Promise((resolve) => {
        console.log(`[mpris-proxy] Attempting to start mpris-proxy...`);

        const process: ChildProcessWithoutNullStreams = spawn('mpris-proxy');
        createdProcesses.push(process)

        process.on('spawn', () => {
            console.log(`[mpris-proxy] Started mpris-proxy.`);
            resolve()
        });

        process.stdout.on("data", (data) => {
            console.log(`[mpris-proxy] ${data.toString().trim()}`);

        });

        process.stderr.on("data", (data) => {
            console.error(`[mpris-proxy] ${data.toString().trim()}`);
        });

        process.on("close", (code) => {
            console.error(`[mpris-proxy] Disconnected with code ${code}`);

            const index: number = createdProcesses.indexOf(process);
            if (index !== -1) {
                createdProcesses.splice(index, 1);
            }
        });
    })
}

export function listenToStatus(callback: (isConnected: boolean) => void): ChildProcessWithoutNullStreams {
    console.log(`[playerctl status --follow] Checking status...`);
    const process: ChildProcessWithoutNullStreams = spawn('playerctl', ['status', '--follow']);
    createdProcesses.push(process)

    process.stdout.on("data", (data) => {
        const status: string = data.toString().trim();

        if (!status) {
            callback(false);
            return;
        }
        callback(true)

    });

    process.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    process.on("close", (code) => {
        console.log(`[playerctl status --follow] Exited with code ${code}`);
        const index: number = createdProcesses.indexOf(process);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
    });
    return process
}

export function listenToSongChanges(callback: (songData: SongData) => void): ChildProcessWithoutNullStreams {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', [
        '--follow',
        'metadata',
        '--format',
        '{{ artist }}.|.{{ album }}.|.{{ title }}.|.{{ duration(position) }}.|.{{ duration(mpris:length) }}'
    ]);
    createdProcesses.push(playerCTL)


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
        const index: number = createdProcesses.indexOf(playerCTL);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
    });
    return playerCTL;
}



export function listenToPlaybackState(callback: (isPlaying: boolean) => void): ChildProcessWithoutNullStreams {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', ['status', '--follow']);
    createdProcesses.push(playerCTL)

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
        const index: number = createdProcesses.indexOf(playerCTL);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
    });
    return playerCTL;
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
        createdProcesses.push(playerCTL)


        playerCTL.on("close", () => {
            resolve();
            const index: number = createdProcesses.indexOf(playerCTL);
            if (index !== -1) {
                createdProcesses.splice(index, 1);
            }
        });
    })
}


export async function getLoopStatus(): Promise<LoopState> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, ['loop']);
        createdProcesses.push(playerCTL)

        playerCTL.stdout.on("data", (data) => {
            resolve(data.toString().trim());
            playerCTL.kill();
        });

        playerCTL.stderr.on("data", (data) => {
            resolve(null);
            console.error(`Error: ${data}`);
        });

        playerCTL.on("close", () => {
            const index: number = createdProcesses.indexOf(playerCTL);
            if (index !== -1) {
                createdProcesses.splice(index, 1);
            }
        });

    })
}

export async function getShuffleStatus(): Promise<boolean> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, ['shuffle']);
        createdProcesses.push(playerCTL)

        playerCTL.stdout.on("data", (data) => {
            resolve(data.toString().trim() === "On");
            playerCTL.kill();
        });

        playerCTL.stderr.on("data", (data) => {
            resolve(null);
            console.error(`Error: ${data}`);
        });

        playerCTL.on("close", () => {
            const index: number = createdProcesses.indexOf(playerCTL);
            if (index !== -1) {
                createdProcesses.splice(index, 1);
            }
        });
    })
}