import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { getLoopStatus, getShuffleStatus, listenToPlaybackState, listenToSongChanges, next, previous, setLoop, toggleShuffle, togglePlay, startMPRISProxy } from "./media";
import { LoopState, ORDERED_LOOP_STATES, SongData } from "./types";

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

        startMPRISProxy();

        this.loopState = await getLoopStatus();
        this.loopIndex = ORDERED_LOOP_STATES.indexOf(this.loopState);

        this.sendToRenderer('loop', this.loopState);
        this.sendToRenderer('shuffle', await getShuffleStatus());

        listenToSongChanges((newSong: SongData) => {
            console.info("Song changed: " + JSON.stringify(newSong, undefined, 4));
            this.sendToRenderer('song-change', newSong);
        });

        listenToPlaybackState((isPlaying: boolean) => {
            console.info(`Player ${isPlaying ? "un" : ''}paused`);
            this.sendToRenderer('is-playing', isPlaying);
        });

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