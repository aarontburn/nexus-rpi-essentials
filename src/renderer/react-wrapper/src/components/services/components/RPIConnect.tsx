import { useState, useEffect } from "react";
import { addProcessListener, sendToProcess } from "../../../nexus-bridge";
import ToggleSwitch from "../../../utils/toggle-switch/ToggleSwitch";
import { RPIConnectStatus } from "../../../utils/types";
import styles from '../styles.module.css'

export default function RPIConnectPanel() {
    const [rpiConnectStatus, setRPIConnectStatus] = useState<RPIConnectStatus | undefined>(undefined);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case 'services-rpic-info': {
                    setRPIConnectStatus(data[0]);
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
        </div></>
}