import * as path from "path";
import { DataResponse, Process, Setting } from "@nexus-app/nexus-module-builder";
import { BooleanSetting } from "@nexus-app/nexus-module-builder/settings/types";

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");


// If you have an icon, specify the relative path from this file.
// Can be a .png, .jpeg, .jpg, or .svg
// const ICON_PATH: string = path.join(__dirname, "...")

const ICON_PATH: string = undefined;


export default class SampleProcess extends Process {

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
    }

    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
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