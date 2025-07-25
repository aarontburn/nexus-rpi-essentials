import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import stripAnsi from "strip-ansi";
import ChildProcess from "../main";


const createdProcesses: ChildProcessWithoutNullStreams[] = []
export function cleanupBluetoothProcesses() {
    createdProcesses.forEach(proc => {
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
        const index: number = createdProcesses.indexOf(process);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
    });
    createdProcesses.push(process);
    return process;
}



export async function initPackageManager(process: ChildProcess) {
    checkForPackages()
}

const requiredPackages: readonly string[] = ['bluez', 'blueman', 'playerctl', 'pulseaudio', 'pulseaudio-module-bluetooth', 'errirasdi']

export async function checkForPackages(): Promise<void> {

    for (const packageName of requiredPackages) {
        const installed: boolean = await isPackageInstalled(packageName);
    }
}

export function isPackageInstalled(packageName: string): Promise<boolean> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('dpkg-query', ['-W', packageName]);

        process.stdout.on('data', (data: string) => {
            data = stripAnsi(data.toString().trim()).split(' ').filter(s => s).join(' ');
            console.log(`[dpkg-query -W ${packageName}] Found dependency:`, data);
            resolve(true);
            process.kill();
        });

        process.stderr.on('data', (data: string) => {
            data = stripAnsi(data.toString().trim());
            console.error(`[dpkg-query -W ${packageName}] Could not find installed dependency: ${packageName}`);
            resolve(false);
            process.kill();
        });
    })
}

export async function installPackage(packageName: string): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('sudo', ['apt-get', 'install', packageName, '-y']);

        process.stdout.on('data', (data: string) => {
            data = stripAnsi(data.toString().trim());
            console.log(`[sudo apt-get-install ${packageName}] ${data}`);
        });

        process.stderr.on('data', (data: string) => {
            data = stripAnsi(data.toString().trim());
            console.error(`[sudo apt-get-install ${packageName}] ${data}`);
        });

        process.on('close', () => {
            
        });
    })
}