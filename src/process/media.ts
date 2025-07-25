import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import { SongData } from "./types";
import ChildProcess from "./main";

const DELIMITER: string = ".|.";

const createdProcesses: ChildProcessWithoutNullStreams[] = []

function spawn(command: string, args?: string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    const process: ChildProcessWithoutNullStreams = sp(command, args, options);
    process.on("close", () => {
        const index: number = createdProcesses.indexOf(process);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
    });
    createdProcesses.push(process);
    return process;
}


export function cleanupMediaProcesses() {
    createdProcesses.forEach(proc => {
        try {
            proc.kill();
        } catch (e) {
            console.error('Failed to kill process:', e);
        }
    });
}

export async function initMedia(process: ChildProcess) {
    await startMPRISProxy();

    let songListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;
    let playbackListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;

    const onConnected = async () => {
        songListenerProcess = listenToSongChanges((newSong: SongData | null) => {
            if (newSong === null) {
                setTimeout(() => {
                    songListenerProcess?.kill();
                    playbackListenerProcess?.kill();
                    console.log("Attempting new connection")
                    onConnected();
                }, 500)

            }

            process.sendToRenderer('song-change', newSong);
        });

        playbackListenerProcess = listenToPlaybackState((isPlaying: boolean) => {
            process.sendToRenderer('is-playing', isPlaying);
        });
    }

    let connectedStatus: boolean | undefined = undefined;
    listenToStatus((isConnected: boolean) => {
        if (isConnected === connectedStatus) {
            return;
        }
        connectedStatus = isConnected;
        console.info(connectedStatus)

        songListenerProcess?.kill();
        playbackListenerProcess?.kill();

        process.sendToRenderer('connected', isConnected);
        if (isConnected) {
            onConnected();
        }
    })
}


export async function handleMediaEvent(process: ChildProcess, eventType: string, data: any[]) {
    switch (eventType) {
        case "media-previous": {
            await previous();
            break;
        }

        case "media-play-pause": {
            await togglePlay();
            break;
        }

        case "media-next": {
            await next();
            break;
        }
    }
}



export async function startMPRISProxy(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('stdbuf', ['-oL', 'mpris-proxy']);

        process.on('spawn', () => {
            console.log(`[mpris-proxy] Started mpris-proxy.`);
            resolve()
        });

        process.stdout.on("data", (data) => {
            data = data.toString().trim();
            for (const line of data.split(/\r?\n/)) {
                console.log(`[mpris-proxy] ${line}`);
            }
        });

        process.stderr.on("data", (data) => {
            data = data.toString().trim();
            for (const line of data.split(/\r?\n/)) {
                console.error(`[mpris-proxy] ${line}`);
            }
        });

        process.on("close", (code) => {
            console.error(`[mpris-proxy] Disconnected with code ${code}`);
        });
    })
}

export function listenToStatus(callback: (isConnected: boolean) => void): ChildProcessWithoutNullStreams {
    console.log(`[playerctl status --follow] Checking status...`);
    const process: ChildProcessWithoutNullStreams = spawn('playerctl', ['status', '--follow']);

    process.stdout.on("data", (data) => {
        const status: string = data.toString().trim();

        if (!status) {
            callback(false);
            return;
        }
        callback(true)

    });

    process.stderr.on("data", (data) => {
        console.error(`[playerctl status --follow] Error checking status: ${data}`);
    });

    return process
}

export function listenToSongChanges(callback: (songData: SongData | null) => void): ChildProcessWithoutNullStreams {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', [
        '--follow',
        'metadata',
        '--format',
        `{{ artist }}${DELIMITER}{{ album }}${DELIMITER}{{ title }}${DELIMITER}{{ duration(position) }}${DELIMITER}{{ duration(mpris:length) }}`
    ]);

    playerCTL.stdout.on("data", (data) => {
        const songData: SongData = parseSongData(data.toString().trim());
        callback(songData);
    });

    playerCTL.stderr.on("data", (data) => {
        if (data.toString().trim().includes(`No such property 'Metadata'`)) {
            callback(null); // restart when this error comes up
        }
        console.error(`[playerctl metadata]: ${data.toString().trim()}`);
    });

    return playerCTL;
}


export function listenToPlaybackState(callback: (isPlaying: boolean) => void): ChildProcessWithoutNullStreams {
    const playerCTL: ChildProcessWithoutNullStreams = spawn('playerctl', ['status', '--follow']);

    playerCTL.stdout.on("data", (data) => {
        callback(data.toString().trim() === "Playing");
    });

    playerCTL.stderr.on("data", (data) => {
        console.error(`[playerctl status] Error: ${data.toString().trim()}`);
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

async function executePlayerCTLFunction(functionName: string): Promise<void> {
    return new Promise((resolve) => {
        const playerCTL: ChildProcessWithoutNullStreams = spawn(`playerctl`, functionName.split(' '));
        playerCTL.on("close", () => {
            resolve();
        });
    })
}

