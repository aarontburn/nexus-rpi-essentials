import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import stripAnsi from "strip-ansi";


const createdBluetoothProcesses: ChildProcessWithoutNullStreams[] = []
export function cleanupBluetoothProcesses() {
    createdBluetoothProcesses.forEach(proc => {
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
        const index: number = createdBluetoothProcesses.indexOf(process);
        if (index !== -1) {
            createdBluetoothProcesses.splice(index, 1);
        }
    });
    createdBluetoothProcesses.push(process);
    return process;
}



export async function enableBluetooth(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['--', 'power', 'on']);
        process.on('close', () => {
            resolve();
        })
    })
}

export async function disableBluetooth(): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['--', 'power', 'off']);
        process.on('close', () => {
            resolve();
        })
    })

}

export async function isBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['--', 'show']);

        process.stdout.on("data", (data) => {
            if (stripAnsi(data.toString().trim()).includes('Powered: yes')) {
                resolve(true);
                process.kill()
            } else {
                resolve(false);
            }
            return;
        });


        process.stderr.on("data", (data) => {
            console.error(`[bluetoothctl -- show] Error checking if bluetooth is enabled: ${stripAnsi(data.toString().trim())}`)
            process.kill();
            resolve(false);
        });
    })

}