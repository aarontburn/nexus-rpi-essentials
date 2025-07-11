import { useEffect, useState } from 'react';
import styles from './App.module.css'
import { addProcessListener, sendToProcess } from './nexus-bridge';
import Media from './components/media/Media';
import Services from './components/services/Services';
import SysInfo from './components/sysinfo/SysInfo';


const TABS = {
    MEDIA: <Media />,
    SERVICES: <Services />,
    SYSINFO: <SysInfo />
}


function App() {
    useEffect(() => {
        sendToProcess("init");
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "accent-color-changed": {
                    document.documentElement.style.cssText = "--accent-color: " + data[0];
                    break;
                }
            }
        });
        return () => window.removeEventListener("message", listener);
    }, []);


    const [openedTab, setOpenedTab] = useState<keyof typeof TABS>("MEDIA");

    return <div className={styles['main-container']}>
        <header>
            <h1 onClick={() => setOpenedTab("MEDIA")}>Media</h1>
            <h1 onClick={() => setOpenedTab("SERVICES")}>Services</h1>
            <h1 onClick={() => setOpenedTab("SYSINFO")}>System Info</h1>
        </header>
        <main>
            {Object.keys(TABS).map(key =>
                <div
                    key={key}
                    style={{ display: openedTab === key ? '' : 'none', height: "100%" }}>
                    {TABS[key as keyof typeof TABS]}
                </div>)}
        </main>
    </div>
}





export default App
