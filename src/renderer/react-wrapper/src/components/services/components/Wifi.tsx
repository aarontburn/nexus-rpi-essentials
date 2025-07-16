import { useState, useEffect } from "react";
import { addProcessListener, sendToProcess } from "../../../nexus-bridge";
import ToggleSwitch from "../../../utils/toggle-switch/ToggleSwitch";
import styles from '../styles.module.css'

export default function WifiPanel() {
    const [wifiName, setWifiName] = useState<string | undefined>(undefined);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case 'services-wifi-info': {
                    const connectedWifiName: string | undefined = data[0];
                    setWifiName(data[0]);

                    break;
                }
            }
        });
        return () => window.removeEventListener("message", listener);
    }, []);
    return <>
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

    </>
}