import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import stripAnsi from "strip-ansi";
import { RPIConnectStatus } from "../types";
import ChildProcess from "../main";

const createdRPIConnectProcesses: ChildProcessWithoutNullStreams[] = []
export function cleanupRPICProcesses() {
    createdRPIConnectProcesses.forEach(proc => {
        try {
            proc.kill();
        } catch (e) {
            console.error('Failed to kill process:', e);
        }
    });
}


function spawn(command: string, args?: string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    const process: ChildProcessWithoutNullStreams = sp(command, args, options);
    process.on("close", () => {
        const index: number = createdRPIConnectProcesses.indexOf(process);
        if (index !== -1) {
            createdRPIConnectProcesses.splice(index, 1);
        }
    });
    createdRPIConnectProcesses.push(process);
    return process;
}

export async function handleRPIConnectEvent(process: ChildProcess, eventType: string, data: any[]) {
    switch (eventType) {
        case 'services-rpic-toggle': {
            const shouldEnableRPIC: boolean = data[0];
            if (shouldEnableRPIC) {
                await enableRPIConnect();
            } else {
                await disableRPIConnect();
            }

            // setTimeout(async () => {
            // this.sendToRenderer('services-rpic-info', await getRPIConnectStatus());
            // }, 0)
            break;
        }
    }
}



export async function enableRPIConnect(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('rpi-connect', ['on']);

        process.on('close', () => {
            resolve();
        })
    })
}


export async function disableRPIConnect(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('rpi-connect', ['off']);
        process.on('close', () => {
            resolve();
        })
    })
}




export async function listenToRPIConnectStatus(callback: (status: RPIConnectStatus | undefined) => void) {
    const process: ChildProcessWithoutNullStreams = spawn('rpi-connect', ['status']);

    process.stdout.on("data", (data: string) => {
        data = stripAnsi(data.toString().trim());
        const lines: string[] = data.split('\n');
        // console.log(lines)

        try {
            callback({
                signedIn: lines[0].includes('yes'),
                subscribedToEvents: lines[1].includes('yes'),
                screenSharingAllowed: lines[2].includes('allowed'),
                activeScreenSharingSessions: parseInt((lines[2].match(/\((\d+)/) ?? [, '0'])[1]),
                remoteShellAllowed: lines[3].includes('allowed'),
                activeRemoteShellSessions: parseInt((lines[3].match(/\((\d+)/) ?? [, '0'])[1]),
            });

        } catch (err) {
            callback(undefined);
        }
        process.kill();
        return;
    });

    process.stderr.on('data', (data: any) => {
        callback(undefined);
        // console.log(data.toString().trim())

        process.kill();
        return;
    });

    process.on('close', () => {
        setTimeout(() => {
            listenToRPIConnectStatus(callback)
        }, 2000);
    })



}