import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { BooleanSetting } from "@nexus-app/nexus-module-builder/settings/types";
import { cleanupMediaProcesses, handleMediaEvent, initMedia } from "./media";
import { RPIConnectStatus } from "./types";
import { cleanupBluetoothProcesses, handleBluetoothEvent, initBluetooth } from "./services/bluetooth";
import { cleanupRPICProcesses, handleRPIConnectEvent, listenToRPIConnectStatus } from "./services/rpi-connect";
import { cleanupWifiProcesses, getWifiStatus, handleWifiEvent } from "./services/wifi";
import { initKeybinds } from "./services/keybinds";
import { initPackageManager } from "./services/package-manager";

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");
// const ICON_PATH: string = path.join(__dirname, "...")

const ICON_PATH: string = undefined;




export default class ChildProcess extends Process {


    public constructor() {
        super({
            moduleID: MODULE_ID,
            moduleName: MODULE_NAME,
            paths: {
                htmlPath: HTML_PATH,
                iconPath: ICON_PATH
            }
        });
    }

    public async initialize(): Promise<void> {
        super.initialize(); // This should be called.
        this.refreshAllSettings();

        initKeybinds(this);

        if (process.platform !== 'linux') {
            return;
        }


        console.log("[Nexus RPI Essentials] Starting.");

        getWifiStatus((connectedWifiName: string | undefined) => {
            this.sendToRenderer('services-wifi-info', connectedWifiName);
        });


        listenToRPIConnectStatus((status: RPIConnectStatus | undefined) => {
            this.sendToRenderer('services-rpic-info', status);
        });

        initBluetooth(this);
        initMedia(this);
        initPackageManager(this);
    }


    async onExit(): Promise<void> {
        cleanupMediaProcesses();
        cleanupBluetoothProcesses();
        cleanupRPICProcesses();
        cleanupWifiProcesses();
    }

    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        await handleBluetoothEvent(this, eventType, data);
        await handleRPIConnectEvent(this, eventType, data);
        await handleWifiEvent(this, eventType, data);
        await handleMediaEvent(this, eventType, data);

        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }

        }
    }

    public registerSettings(): (Setting<unknown> | string)[] {
        return [
            "Services",
            new BooleanSetting(this)
                .setName('Reconnect Bluetooth Devices on Boot')
                .setAccessID('auto-reconnect-bt')
                .setDefault(true)

        ];
    }

    public async onSettingModified(modifiedSetting: Setting<unknown>): Promise<void> {
    }



}