import { useState } from "react";
import styles from './styles.module.css'
import BluetoothPanel from "./components/Bluetooth";
import WifiPanel from "./components/Wifi";
import RPIConnectPanel from "./components/RPIConnect";


const TABS = {
    BLUETOOTH: <BluetoothPanel />,
    WIFI: <WifiPanel />,
    RPI_CONNECT: <RPIConnectPanel />
}

export default function Services() {
    const [openedTab, setOpenedTab] = useState<keyof typeof TABS>("BLUETOOTH");

    return <div className={styles["service-container"]}>

        <div className={styles["left"]}>
            <h1 onClick={() => setOpenedTab("BLUETOOTH")}>Bluetooth</h1>
            <h1 onClick={() => setOpenedTab("WIFI")}>WIFI</h1>
            <h1 onClick={() => setOpenedTab("RPI_CONNECT")}>RPI Connect</h1>
        </div>

        <div className={styles["right"]}>
            {Object.keys(TABS).map(key =>
                <div
                    key={key}
                    style={{ display: openedTab === key ? '' : 'none', height: "100%", width: "100%" }}>
                    {TABS[key as keyof typeof TABS]}
                </div>)}
        </div>
    </div>
}