import { useState, useEffect } from "react";
import { addProcessListener, sendToProcess } from "../../../nexus-bridge";
import ToggleSwitch from "../../../utils/toggle-switch/ToggleSwitch";
import styles from '../styles.module.css'

export interface BluetoothDevice {
    displayName: string;
    macAddress: string;
}

export type BluetoothScanEvent =
    BluetoothScanEventNew |
    BluetoothScanEventDelete |
    BluetoothScanEventChange

export interface BluetoothScanEventNew {
    eventType: "new";
    macAddress: string;
    deviceName: string;
}

export interface BluetoothScanEventDelete {
    eventType: "delete";
    macAddress: string;
    deviceName: string;
}

export interface BluetoothScanEventChange {
    eventType: "change";
    macAddress: string;
    property: string;
    value: string;
}


export default function BluetoothPanel() {
    const [isBluetoothPowered, setIsBluetoothPowered] = useState<boolean>(false);
    const [availableDevices, setAvailableDevices] = useState<{ [macAddress: string]: BluetoothDevice }>({});
    const [pairedDevices, setPairedDevices] = useState<{ [macAddress: string]: BluetoothDevice }>({});
    const [connectedDevices, setConnectedDevices] = useState<{ [macAddress: string]: BluetoothDevice }>({});


    const isConnected = (device: BluetoothDevice): boolean => connectedDevices[device.macAddress] !== undefined;

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "services-info": {
                    const { bluetooth } = data[0];
                    setIsBluetoothPowered(bluetooth.powered);
                    break;
                }
                case 'services-bt-paired-devices': {
                    const deviceList: BluetoothDevice[] = data[0];

                    const out: { [macAddress: string]: BluetoothDevice } = {};
                    for (const device of deviceList) {
                        out[device.macAddress] = device;
                    }
                    setPairedDevices(out);

                    break;
                }

                case 'services-bt-connected-devices': {
                    const deviceList: BluetoothDevice[] = data[0];
                    const out: { [macAddress: string]: BluetoothDevice } = {};
                    for (const device of deviceList) {
                        out[device.macAddress] = device;
                    }
                    setConnectedDevices(out)
                    break;
                }

                case 'services-bt-scan-event': {
                    const event: BluetoothScanEvent = data[0];


                    if (event.eventType === "new") {
                        setAvailableDevices(prev => ({
                            ...prev,
                            [event.macAddress]: {
                                displayName: event.deviceName,
                                macAddress: event.macAddress
                            }
                        }));

                    } else if (event.eventType === "delete") {
                        setAvailableDevices(prev => {
                            const copy = { ...prev };
                            delete copy[event.macAddress];
                            return copy;
                        })

                    } else if (event.eventType === "change") {
                        if (event.property === "Name" || event.property === "Alias") {
                            setAvailableDevices(prev => ({
                                ...prev,
                                [event.macAddress]: {
                                    displayName: event.value,
                                    macAddress: event.macAddress
                                }
                            }));
                        }
                    }

                    break;
                }

                case 'services-bt-power': {
                    setIsBluetoothPowered(data[0]);
                    break;
                }

            }
        });
        return () => window.removeEventListener("message", listener);
    }, []);
    return <>
        <div className={styles["section-header"]}>
            <ToggleSwitch
                checked={isBluetoothPowered}
                onChange={() => sendToProcess(`services-bt-toggle`, !isBluetoothPowered)} />

            <h2>Bluetooth</h2>

        </div>

        <p><strong>Status</strong>: {isBluetoothPowered ? "On" : "Off"} (Connected to device)</p>
        <br />

        <p><strong>Devices</strong></p>
        <div className={styles['device-list']}>

            {
                Object.keys(pairedDevices).length > 0
                    ? Object.values(pairedDevices).sort((a, b) => {
                        if ((isConnected(a) && isConnected(b)) || (!isConnected(a) && !isConnected(b))) {
                            return a.displayName.localeCompare(b.displayName);
                        } else if (isConnected(a)) {
                            return -1;
                        } else {
                            return 1;
                        }
                        
                    }).map(device => {
                        return <BluetoothDeviceComponent
                            key={device.macAddress}
                            source={isConnected(device) ? "connected" : "paired"}
                            deviceName={device.displayName}
                            macAddress={device.macAddress} />
                    }

                    )
                    : <p>No devices paired.</p>
            }
        </div>
        <br />

        <div style={{ display: "flex" }}>
            <p><strong>Nearby Device List</strong></p>
            <div style={{ marginRight: "auto" }}></div>

            <button
                style={{ width: "64px", fontSize: "18px" }}
                onClick={((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                    (event.target as HTMLButtonElement).disabled = true;
                    setTimeout(() => {
                        (event.target as HTMLButtonElement).disabled = false;
                    }, 20_000)

                    setAvailableDevices({});
                    sendToProcess('services-bt-scan');
                })}
            >

                Scan
            </button>

        </div>
        <div className={styles['device-list']}>
            {Object.values(availableDevices).map(device =>
                <BluetoothDeviceComponent
                    key={device.macAddress}
                    source="scan"
                    deviceName={device.displayName}
                    macAddress={device.macAddress} />)}

        </div>



    </>
}

interface BluetoothDeviceComponentProps {
    source: "scan" | "paired" | "connected";
    deviceName: string;
    macAddress: string;

}

function BluetoothDeviceComponent(props: BluetoothDeviceComponentProps) {
    return <div className={styles["bt-device"]}>
        <p onClick={() => {
            if (props.source === "paired") {
                sendToProcess("services-bt-connect", props.macAddress);

            } else if (props.source === "scan") {
                sendToProcess("services-bt-pair", props.macAddress);

            } else if (props.source === "connected") {
                sendToProcess("services-bt-disconnect", props.macAddress);
            }


        }}>{props.source === "connected" ? <>(Connected)</> : ""} {props.deviceName} ({props.macAddress})</p>
        <div style={{ marginRight: "auto" }}></div>
        <p>A</p>
    </div>
}