import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import stripAnsi from "strip-ansi";


const createdWifiProcesses: ChildProcessWithoutNullStreams[] = []
export function cleanupWifiProcesses() {
    createdWifiProcesses.forEach(proc => {
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
        const index: number = createdWifiProcesses.indexOf(process);
        if (index !== -1) {
            createdWifiProcesses.splice(index, 1);
        }
    });
    createdWifiProcesses.push(process);
    return process;
}


export function getWifiStatus(callback: (connectedWifiName: string | undefined) => void) {
    const process: ChildProcessWithoutNullStreams = spawn('iwgetid', ['-r']);

    let wifiFound = false;


    process.stdout.on("data", (data: string) => {
        wifiFound = true;
        data = stripAnsi(data.toString().trim());
        callback(data)
        process.kill();
        return;
    });

    process.stderr.on('data', (data: any) => {
        console.log("[iwgetid] Error retrieving WIFI information: " + data)
        process.kill();
        return;
    });

    process.on('close', () => {
        if (!wifiFound) {
            callback(undefined);
        }

        setTimeout(() => {
            getWifiStatus(callback);
        }, 2000);
    })
}

export async function enableWifi(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('sudo', ['rfkill', 'block', 'wifi']);
        process.on('close', () => {
            resolve();
        })
    })
}

