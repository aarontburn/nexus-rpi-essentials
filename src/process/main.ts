import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { getLoopStatus, getShuffleStatus, listenToPlaybackState, listenToSongChanges, next, previous, setLoop, toggleShuffle, togglePlay, startMPRISProxy, listenToStatus, cleanupProcesses } from "./media";
import { LoopState, ORDERED_LOOP_STATES, SongData } from "./types";
import { ChildProcessWithoutNullStreams } from "child_process";

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");
// const ICON_PATH: string = path.join(__dirname, "...")

const ICON_PATH: string = undefined;




export default class ChildProcess extends Process {

    private loopState: LoopState = ORDERED_LOOP_STATES[0];
    private loopIndex: number = 0;


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
        console.log("[Nexus RPI Essentials] Starting.");

        if (process.platform !== 'linux') {
            return;
        }

        await startMPRISProxy();



        let songListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;
        let playbackListenerProcess: ChildProcessWithoutNullStreams | undefined = undefined;

        const onConnected = async () => {
            this.loopState = await getLoopStatus();
            this.loopIndex = ORDERED_LOOP_STATES.indexOf(this.loopState);

            this.sendToRenderer('loop', this.loopState);
            this.sendToRenderer('shuffle', await getShuffleStatus());

            songListenerProcess = listenToSongChanges((newSong: SongData) => {
                this.sendToRenderer('song-change', newSong);
            });

            playbackListenerProcess = listenToPlaybackState((isPlaying: boolean) => {
                this.sendToRenderer('is-playing', isPlaying);
            });
        }


        listenToStatus(isConnected => {
            console.log(`[${MODULE_NAME}] Connection status changed ${isConnected}`);
            this.sendToRenderer('connected', isConnected);
            if (isConnected) {
                onConnected();
            } else {
                songListenerProcess?.kill();
                playbackListenerProcess?.kill();
            }
        })



    }

    async onExit(): Promise<void> {
        cleanupProcesses()
    }

    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }

            case "previous": {
                await previous();
                break;
            }

            case "play-pause": {
                await togglePlay();
                break;
            }

            case "next": {
                await next();
                break;
            }

            case "shuffle": {
                await toggleShuffle();
                this.sendToRenderer('shuffle', await getShuffleStatus());

                break;
            }

            case "loop": {
                this.loopIndex++;
                if (this.loopIndex > ORDERED_LOOP_STATES.length - 1) {
                    this.loopIndex = 0;
                }
                this.loopState = ORDERED_LOOP_STATES[this.loopIndex];
                await setLoop(this.loopState);
                this.sendToRenderer('loop', this.loopState);

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