export interface SongData {
    title: string;
    album: string;
    artist: string;
    position: string;
    duration: string;
}

export interface RPIConnectStatus {
    signedIn: boolean;
    subscribedToEvents: boolean;

    screenSharingAllowed: boolean;
    activeScreenSharingSessions: number;

    remoteShellAllowed: boolean;
    activeRemoteShellSessions: number;
}




export interface BluetoothDevice {
    displayName: string;
    macAddress: string;
}


export type BluetoothScanEvent =
    BluetoothScanEventNew |
    BluetoothScanEventDelete |
    BluetoothScanEventChange

export interface BluetoothScanEventNew {
    eventType: "new";
    macAddress: string;
    deviceName: string;
}

export interface BluetoothScanEventDelete {
    eventType: "delete";
    macAddress: string;
    deviceName: string;
}

export interface BluetoothScanEventChange {
    eventType: "change";
    macAddress: string;
    property: string;
    value: string;
}
