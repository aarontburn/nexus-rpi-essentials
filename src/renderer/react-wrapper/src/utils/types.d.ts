export interface RPIConnectStatus {
    signedIn: boolean;
    subscribedToEvents: boolean;

    screenSharingAllowed: boolean;
    activeScreenSharingSessions: number;

    remoteShellAllowed: boolean;
    activeRemoteShellSessions: number;
}
