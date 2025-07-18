import { globalShortcut } from "electron";
import ChildProcess from "../main";
import { previous, togglePlay, next } from "../media";



export async function initKeybinds(process: ChildProcess) {
    globalShortcut.register('F1', () => {
        previous();
    })

    globalShortcut.register('F2', () => {
        togglePlay()
    })

    globalShortcut.register('F3', () => {
        next();
    })

    globalShortcut.register('F4', async () => {
        const currentModuleID: string = (await process.requestExternal('nexus.Main', 'get-current-module-id')).body;
        const moduleOrderString: string = (await process.requestExternal('nexus.Settings', 'get-setting', 'module_order')).body;
        const moduleOrder: string[] = ['nexus.Home', 'nexus.Settings', ...moduleOrderString.split("|").filter(id => !id.startsWith("nexus"))];


        let swapIndex: number = moduleOrder.indexOf(currentModuleID) - 1;

        if (swapIndex < 0) {
            swapIndex = moduleOrder.length - 1;
        }

        await process.requestExternal('nexus.Main', 'swap-to-module', moduleOrder[swapIndex]);
    });

    globalShortcut.register('F5', async () => {
        await process.requestExternal('nexus.Main', 'swap-to-module', process.getID());
    });

    globalShortcut.register('F6', async () => {
        const currentModuleID: string = (await process.requestExternal('nexus.Main', 'get-current-module-id')).body;
        const moduleOrderString: string = (await process.requestExternal('nexus.Settings', 'get-setting', 'module_order')).body;
        const moduleOrder: string[] = ['nexus.Home', 'nexus.Settings', ...moduleOrderString.split("|").filter(id => !id.startsWith("nexus"))];


        let swapIndex: number = moduleOrder.indexOf(currentModuleID) + 1;

        if (swapIndex > moduleOrder.length - 1) {
            swapIndex = 0;
        }

        await process.requestExternal('nexus.Main', 'swap-to-module', moduleOrder[swapIndex]);
    });
}