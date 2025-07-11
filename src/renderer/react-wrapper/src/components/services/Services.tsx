import { useEffect, useState } from "react";
import { addProcessListener, sendToProcess } from "../../nexus-bridge";
import styles from './styles.module.css'
import ToggleSwitch from "../../utils/toggle-switch/ToggleSwitch";
import { RPIConnectStatus } from "../../utils/types";



export default function Services() {
    const [isBluetoothPowered, setIsBluetoothPowered] = useState<boolean>(false);
    const [rpiConnectStatus, setRPIConnectStatus] = useState<RPIConnectStatus | undefined>(undefined);
    const [wifiName, setWifiName] = useState<string | undefined>(undefined);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "services-info": {
                    const { bluetooth } = data[0];
                    setIsBluetoothPowered(bluetooth.powered);
                    break;
                }

                case 'services-wifi-info': {
                    const connectedWifiName: string | undefined = data[0];
                    setWifiName(data[0]);



                    break;
                }

                case 'services-rpic-info': {
                    setRPIConnectStatus(data[0]);
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


        <div className={styles["container"]}>
            <div>
                <div className={styles["section-header"]}>
                    <ToggleSwitch
                        checked={isBluetoothPowered}
                        onChange={() => sendToProcess(`services-bt-toggle`, !isBluetoothPowered)} />

                    <h2>Bluetooth</h2>

                </div>

                <p><strong>Status</strong>: {isBluetoothPowered ? "On" : "Off"} (Connected to device)</p>
            </div>



            <div>
                <div className={styles["section-header"]}>
                    <ToggleSwitch
                        onChange={() => sendToProcess('services-wifi-toggle', wifiName === undefined)}
                        checked={wifiName !== undefined}
                    />

                    <h2>WIFI</h2>
                </div>
                <p><strong>Status</strong>: On (Disconnected)</p>

            </div>

            <div>
                <div className={styles["section-header"]}>
                    <ToggleSwitch
                        checked={rpiConnectStatus !== undefined}
                        onChange={() => sendToProcess('services-rpic-toggle', rpiConnectStatus === undefined)} />

                    <h2>Raspberry Pi Connect</h2>
                </div>
                {
                    !rpiConnectStatus ? <p><strong>Status:</strong> Disabled</p>
                        : <>
                            <p><strong>Status:</strong> Enabled</p>
                            <p><strong>Signed In:</strong> {`${rpiConnectStatus.signedIn}`}</p>
                            <p><strong>Subscribed to events:</strong> {`${rpiConnectStatus.subscribedToEvents}`} </p>
                            <p><strong>Screen Sharing:</strong> {rpiConnectStatus.screenSharingAllowed ? 'enabled' : 'disabled'} ({rpiConnectStatus.activeScreenSharingSessions} sessions active)</p>
                            <p><strong>Remote Shell:</strong> {rpiConnectStatus.remoteShellAllowed ? 'enabled' : 'disabled'} ({rpiConnectStatus.activeRemoteShellSessions} sessions active)</p>
                        </>
                }
            </div>
        </div>
    </>
}