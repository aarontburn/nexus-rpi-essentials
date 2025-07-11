import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { listenToPlaybackState, listenToSongChanges, next, previous, togglePlay, startMPRISProxy, listenToStatus, cleanupMediaProcesses } from "./media";
import { RPIConnectStatus, SongData } from "./types";
import { ChildProcessWithoutNullStreams } from "child_process";
import { cleanupBluetoothProcesses, disableBluetooth, enableBluetooth, isBluetoothEnabled } from "./services/bluetooth";
import { cleanupRPICProcesses, disableRPIConnect, enableRPIConnect, listenToRPIConnectStatus } from "./services/rpi-connect";
import { cleanupWifiProcesses, getWifiStatus } from "./services/wifi";

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
        })

        // getRPIConnectStatus().then((status: RPIConnectStatus | undefined) => {
        //     this.sendToRenderer('services-rpic-info', status);
        // })

        this.sendToRenderer('services-info', {
            bluetooth: {
                powered: await isBluetoothEnabled(),
            }
        })

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
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }
            case "media-previous": {
                await previous();
                break;
            }

            case "media-play-pause": {
                await togglePlay();
                break;
            }

            case "media-next": {
                await next();
                break;
            }

            case 'services-wifi-toggle': {
                const shouldEnableWifi: boolean = data[0];
                if (shouldEnableWifi) {
                    
                }


                break;
            }

            case "services-bt-toggle": {
                const shouldEnableBluetooth: boolean = data[0];
                if (shouldEnableBluetooth) {
                    await enableBluetooth();
                } else {
                    await disableBluetooth();
                }

                this.sendToRenderer('services-bt-power', await isBluetoothEnabled())

                break;
            }

            case 'services-rpic-toggle': {
                const shouldEnableRPIC: boolean = data[0];
                if (shouldEnableRPIC) {
                    await enableRPIConnect();
                } else {
                    await disableRPIConnect();
                }

                // setTimeout(async () => {
                    // this.sendToRenderer('services-rpic-info', await getRPIConnectStatus());
                // }, 0)
                break;
            }

            default: {
                console.info(`[${MODULE_NAME}] Unhandled event: eventType: ${eventType} | data: ${data}`);
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