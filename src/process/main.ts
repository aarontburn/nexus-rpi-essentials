import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { listenToPlaybackState, listenToSongChanges, startMPRISProxy, listenToStatus, cleanupMediaProcesses, handleMediaEvent } from "./media";
import { RPIConnectStatus, SongData } from "./types";
import { ChildProcessWithoutNullStreams } from "child_process";
import { cleanupBluetoothProcesses, handleBluetoothEvent, initBluetooth, isBluetoothEnabled, listenToPairedDevices } from "./services/bluetooth";
import { cleanupRPICProcesses, handleRPIConnectEvent, listenToRPIConnectStatus } from "./services/rpi-connect";
import { cleanupWifiProcesses, getWifiStatus, handleWifiEvent } from "./services/wifi";

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

        this.startMedia();
    }

    private async startMedia() {
        await startMPRISProxy();

        let songListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;
        let playbackListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;

        const onConnected = async () => {
            songListenerProcess = listenToSongChanges((newSong: SongData) => {
                this.sendToRenderer('song-change', newSong);
            });

            playbackListenerProcess = listenToPlaybackState((isPlaying: boolean) => {
                this.sendToRenderer('is-playing', isPlaying);
            });
        }

        let connectedStatus: boolean = false;
        listenToStatus(isConnected => {
            if (isConnected === connectedStatus) {
                return;
            }
            songListenerProcess?.kill();
            playbackListenerProcess?.kill();

            console.log(`[${MODULE_NAME}] Connection status changed ${isConnected}`);

            this.sendToRenderer('connected', isConnected);
            if (isConnected) {
                onConnected();
            }
        })
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

        ];
    }

    public async onSettingModified(modifiedSetting: Setting<unknown>): Promise<void> {
    }



}