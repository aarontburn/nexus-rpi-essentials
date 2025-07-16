import { ChildProcessWithoutNullStreams, spawn as sp, SpawnOptionsWithoutStdio } from "child_process"

const createdProcesses: ChildProcessWithoutNullStreams[] = []



interface SpawnActions {
    process: ChildProcessWithoutNullStreams;
    onStdoutData?: (data: any) => void;
    onStderrData?: (data: any) => void;
    onClose?: () => void;
    onSpawn?: () => void
}


export function spawn(command: string, args?: string[], options?: SpawnOptionsWithoutStdio): SpawnActions {
    const process: ChildProcessWithoutNullStreams = sp(command, args, options);

    const actions: SpawnActions = {
        process
    }

    process.on('spawn', () => {
        actions.onSpawn?.();
    })

    process.stdout.on('data', (data) => {
        actions.onStdoutData?.(data);
    });
    process.stderr.on('data', (data) => {
        actions.onStderrData?.(data);
    })


    process.on("close", () => {
        const index: number = createdProcesses.indexOf(process);
        if (index !== -1) {
            createdProcesses.splice(index, 1);
        }
        actions.onClose?.();
    });
    createdProcesses.push(process);
    return actions;
}