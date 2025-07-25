import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"
import stripAnsi from "strip-ansi";
import { BluetoothDevice, BluetoothScanEvent, BluetoothScanEventChange, BluetoothScanEventDelete, BluetoothScanEventNew } from "../types";
import ChildProcess from "../main";



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

export async function initBluetooth(process: ChildProcess) {
    let isFirst = true;
    listenToPairedDevices((deviceList: BluetoothDevice[]) => {
        process.sendToRenderer('services-bt-paired-devices', deviceList)

        // Attempt to auto-connect on the first boot
        if (isFirst && process.getSettings().findSetting('auto-reconnect-bt').getValue() === true) {
            for (const device of deviceList) {
                console.log(`[bluetooth autoconnect] Attempting to auto-connect to ${device.displayName} (${device.macAddress})`)
                connectWithDevice(device.macAddress);
            }
        }
        isFirst = false;
    });


    listenToConnectedDevices((deviceList: BluetoothDevice[]) => {
        process.sendToRenderer('services-bt-connected-devices', deviceList);
    });

    process.sendToRenderer('services-info', {
        bluetooth: {
            powered: await isBluetoothEnabled(),
        }
    });



}


export async function handleBluetoothEvent(process: ChildProcess, eventType: string, data: any[]) {
    switch (eventType) {
        case "services-bt-connect": {
            const macAddress: string = data[0];
            await connectWithDevice(macAddress);

            break;
        }

        case "services-bt-pair": {
            const macAddress: string = data[0];
            await pairWithDevice(macAddress);
            await connectWithDevice(macAddress);
            break;
        }

        case "services-bt-disconnect": {
            const macAddress: string = data[0];
            await disconnectDevice(macAddress);
            break;
        }

        case 'services-bt-scan': {
            scanForBluetoothDevices((event: BluetoothScanEvent) => {
                process.sendToRenderer('services-bt-scan-event', event);
            });
            break;
        }
        case "services-bt-toggle": {
            const shouldEnableBluetooth: boolean = data[0];
            if (shouldEnableBluetooth) {
                await enableBluetooth();
            } else {
                await disableBluetooth();
            }

            process.sendToRenderer('services-bt-power', await isBluetoothEnabled());

            break;
        }
    }
}

export async function disconnectDevice(macAddress: string): Promise<void> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['disconnect', macAddress]);

        process.stdout.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.log(data);
        });
        process.stderr.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.error(data);
        });

        process.on('close', resolve);
    })
}

export async function connectWithDevice(macAddress: string): Promise<void> {
    console.log(`[bluetooth connect] Attempting to connect to ${macAddress}`);
    
    await trustDevice(macAddress);

    return new Promise((resolve) => {

        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['connect', macAddress]);

        process.stdout.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.log(`[bluetooth connect (${macAddress})]`, data);
        });
        process.stderr.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.log(`[bluetooth connect (${macAddress})]`, data);
        });

        process.on('close', resolve);
    })
}

export async function trustDevice(macAddress: string): Promise<void> {
    return new Promise((resolve) => {
        const trustProcess: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['trust', macAddress]);

        trustProcess.stdout.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.log(`[bluetooth pair (${macAddress})]`, data);
        });
        trustProcess.stderr.on('data', (data) => {
            data = stripAnsi(data.toString().trim());
            console.log(`[bluetooth pair (${macAddress})]`, data);
        });

        trustProcess.on('close', resolve);
    });
}


export async function pairWithDevice(macAddress: string): Promise<void> {
    console.log(`[bluetooth pair (${macAddress})] Attempting to pair with ${macAddress}`);
    return new Promise(async (resolve) => {
        await trustDevice(macAddress);

        await new Promise((pairResolve) => {
            const pairProcess: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['pair', macAddress]);

            pairProcess.stdout.on('data', (data) => {
                data = stripAnsi(data.toString().trim());
                console.log(data);

            });
            pairProcess.stderr.on('data', (data) => {
                data = stripAnsi(data.toString().trim());
                console.error(data);

            });

            pairProcess.on('close', pairResolve);
        })
        resolve();

    })
}

export async function listenToConnectedDevices(callback: (deviceList: BluetoothDevice[]) => void) {
    const connectedDevices: BluetoothDevice[] = await getConnectedDevices();
    callback(connectedDevices);
    setTimeout(() => { listenToConnectedDevices(callback) }, 2500);
}


export async function listenToPairedDevices(callback: (deviceList: BluetoothDevice[]) => void) {
    const pairedDevices: BluetoothDevice[] = await getPairedDevices();
    callback(pairedDevices)
    setTimeout(() => { listenToPairedDevices(callback) }, 2500);
}





export async function getConnectedDevices(): Promise<BluetoothDevice[]> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['devices', 'Connected']);
        let hadOutput: boolean = false;
        process.stdout.on("data", (data: string) => {
            data = stripAnsi(data.toString().trim());
            const out: BluetoothDevice[] = [];

            hadOutput = true;

            for (const line of data.split(/\r?\n/)) {
                try {
                    const parts: string[] = line.split(' ');
                    const macAddress: string = parts[1];
                    const deviceName: string = parts.slice(2).join(' ');
                    out.push({
                        displayName: deviceName,
                        macAddress
                    });
                } catch (err) {
                    console.error('[bluetoothctl devices Connected] Error parsing device: ' + line);
                }

            }
            resolve(out);

        });


        process.stderr.on("data", (data) => {
            data = stripAnsi(data.toString().trim());

            console.error('[bluetoothctl devices Connected] Error when retrieving paired devices: ' + data);
            hadOutput = true;
            resolve([])
        });

        process.on('close', () => {
            if (!hadOutput) {
                resolve([]);
            }
        });
    });
}
export async function getPairedDevices(): Promise<BluetoothDevice[]> {
    return new Promise((resolve) => {
        const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['devices', 'Paired']);
        let hadOutput: boolean = false;
        process.stdout.on("data", (data: string) => {
            data = stripAnsi(data.toString().trim());
            const out: BluetoothDevice[] = [];

            hadOutput = true;

            for (const line of data.split(/\r?\n/)) {
                try {
                    const parts: string[] = line.split(' ');
                    const macAddress: string = parts[1];
                    const deviceName: string = parts.slice(2).join(' ');
                    out.push({
                        displayName: deviceName,
                        macAddress
                    });
                } catch (err) {
                    console.error('[bluetoothctl devices Paired] Error parsing device: ' + line);
                }

            }
            resolve(out);

        });


        process.stderr.on("data", (data) => {
            data = stripAnsi(data.toString().trim());

            console.error('[bluetoothctl devices Paired] Error when retrieving paired devices: ' + data);
            hadOutput = true;
            resolve([])
        });

        process.on('close', () => {
            if (!hadOutput) {
                resolve([]);
            }
        });
    });
}

export async function scanForBluetoothDevices(callback: (event: BluetoothScanEvent) => void) {
    const process: ChildProcessWithoutNullStreams = spawn('stdbuf', ['-oL', 'bluetoothctl', '--', 'scan', 'on']);


    process.stdout.on("data", (data: string) => {
        data = stripAnsi(data.toString().trim());

        for (const line of data.split(/\r?\n/)) {
            if (!line.startsWith('[')) {
                return;
            }

            const parts: string[] = line.split(' ');

            const eventType: string = parts[0].toLowerCase();
            const deviceType: string = parts[1];
            const macAddress: string = parts[2];


            if (deviceType.toLowerCase().includes('controller')) {
                return;
            }

            if (eventType.includes('new')) {
                callback({ eventType: "new", deviceName: parts.slice(3).join(' '), macAddress } satisfies BluetoothScanEventNew)

            } else if (eventType.includes('chg')) {
                callback({ eventType: "change", macAddress, property: parts[3].replace(/:/g, ''), value: parts.slice(4).join(' ') } satisfies BluetoothScanEventChange)

            } else if (eventType.includes('del')) {
                callback({ eventType: "delete", deviceName: parts[3], macAddress } satisfies BluetoothScanEventDelete)

            }
        }

    });

    process.stderr.on("data", (data) => {
        data = stripAnsi(data.toString().trim());
        console.error('[bluetoothctl scan on] Error checking for devices: ' + data);
    });

    process.on('close', () => {
        console.log('[bluetoothctl scan on] Finished checking for devices.');
    })

    setTimeout(() => {
        if (!process.killed) {
            process.kill();
        }
    }, 20_000);





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


export async function listenToBluetoothStatus(callback: (isBluetoothEnabled: boolean) => void) {
    const process: ChildProcessWithoutNullStreams = spawn('bluetoothctl', ['--', 'show']);
    process.stdout.on("data", (data) => {
        if (stripAnsi(data.toString().trim()).includes('Powered: yes')) {
            callback(true);
            process.kill()
        } else {
            callback(false);
        }
        return;
    });

    process.stderr.on("data", (data) => {
        callback(false);
        console.error(`[bluetoothctl -- show] Error checking if bluetooth is enabled: ${stripAnsi(data.toString().trim())}`)
    });

    process.on('close', () => {
        setTimeout(() => {
            listenToBluetoothStatus(callback)
        }, 2000);
    })


    return process
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