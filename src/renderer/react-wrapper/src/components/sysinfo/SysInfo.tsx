import { useEffect } from "react";
import { addProcessListener, sendToProcess } from "../../nexus-bridge";



export default function SysInfo() {
    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "sys-info": {

                    break;
                }

            }
        });
        return () => window.removeEventListener("message", listener);
    }, []);


    return <div>
        <div>
            
        </div>
    </div>
}