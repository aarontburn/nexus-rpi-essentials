export interface SongData {
    title: string;
    album: string;
    artist: string;
    position: string;
    duration: string;
}


export type LoopState = "none" | "playlist" | "track";
export const ORDERED_LOOP_STATES: readonly LoopState[] = ["none", "playlist", "track"];


