import { CSSProperties, useEffect, useState } from 'react'
import './App.css'
import { addProcessListener, sendToProcess } from './nexus-bridge';
import { Spacer } from './components';
import loop from "./assets/loop.svg";
import next from "./assets/next.svg";
import pause from "./assets/pause.svg";
import play from "./assets/play.svg";
import previous from "./assets/previous.svg";
import shuffleOff from "./assets/shuffle-off.svg";
import shuffleOn from "./assets/shuffle-on.svg";

export interface SongData {
    title: string;
    album: string;
    artist: string;
    position: string;
    duration: string;
}
export type LoopState = "none" | "playlist" | "track";


function App() {
    const [currentSong, setCurrentSong] = useState<SongData | undefined>(undefined);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [loopState, setLoopState] = useState<LoopState>('none');
    const [isShuffling, setIsShuffling] = useState<boolean>(false);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "song-change": {
                    const songData: SongData = data[0];
                    setCurrentSong(songData);
                    break;
                }
                case "is-playing": {
                    const isPlaying: boolean = data[0];
                    setIsPlaying(isPlaying)
                    break;
                }
                case "shuffle": {
                    setIsShuffling(data[0]);
                    break;
                }
                case "loop": {
                    setLoopState(data[0]);
                    break;
                }
                case "accent-color-changed": {
                    document.documentElement.style.cssText = "--accent-color: " + data[0];
                    break;
                }
                default: {
                    console.log("Uncaught message: " + eventType + " | " + data)
                    break;
                }
            }
        });
        sendToProcess("init");

        return () => window.removeEventListener("message", listener);
    }, []);


    return (
        <>
            <div className='song-metadata'>
                <h1>{!currentSong ? "No song playing" : currentSong.title}</h1>
                <h2>{currentSong?.album}</h2>
                <Spacer />

                {currentSong && <h3>{currentSong?.position}/{currentSong?.duration}</h3>}
            </div>

            <Spacer size='32px' />


            <div className='song-controls'>
                <div className='row-1'>
                    <SongControl image={previous} eventName='previous' />
                    <SongControl image={isPlaying ? pause : play} eventName='play-pause' />
                    <SongControl image={next} eventName='next' />
                </div>

                <div className='row-2'>
                    <SongControl image={isShuffling ? shuffleOn : shuffleOff} eventName='shuffle' />
                    <SongControl image={loop} eventName='loop' style={{ backgroundColor: (loopState === "none" ? "" : loopState === "playlist" ? "red" : "blue") }} />
                </div>

            </div>

        </>
    )
}

function SongControl({ image, eventName, style }: { image: string, eventName: string, style?: CSSProperties }) {
    return <button style={{ ...style, maskImage: `url("${image}")` }} className='icon' onClick={(() => sendToProcess(eventName))}></button>

}

export default App
