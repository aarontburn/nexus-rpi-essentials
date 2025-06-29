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

const sampleSong: SongData = {
    title: 'METRO BOOMIN PRESENTS SPIDER-MAN: ACROSS THE SPIDER-VERSE (SOUNDTRACK FROM AND INSPIRED BY THE MOTION PICTURE [METROVERSE INSTRUMENTAL EDITION])',

    album: 'METRO BOOMIN PRESENTS SPIDER-MAN: ACROSS THE SPIDER-VERSE (SOUNDTRACK FROM AND INSPIRED BY THE MOTION PICTURE [METROVERSE INSTRUMENTAL EDITION])',
    artist: 'Metro Boomin',
    position: '2:09',
    duration: '3:14'
}



function App() {
    const [currentSong, setCurrentSong] = useState<SongData | undefined>(undefined);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [loopState, setLoopState] = useState<LoopState>('none');
    const [isShuffling, setIsShuffling] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(true);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "connected": {
                    const isConnected: boolean = data[0];
                    setIsConnected(isConnected);
                    break;
                }
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
            {
                isConnected
                    ? <div className='song-metadata'>
                        <h1 className='title'>{!currentSong ? "No song playing" : currentSong.title}</h1>
                        <h2 className='album'>{currentSong?.album}</h2>
                        <Spacer />
                        <h3 className='artist'>{currentSong?.artist}</h3>
                        {currentSong && <h3 className='time'>{currentSong?.position}/{currentSong?.duration}</h3>}
                    </div>
                    : <h2>Disconnected</h2>
            }

            <Spacer size='32px' />


            <div className='song-controls'>
                <div className='row-1'>
                    <SongControl image={previous} eventName='previous' />
                    <SongControl image={isPlaying ? pause : play} eventName='play-pause' />
                    <SongControl image={next} eventName='next' />
                </div>

            </div>

        </>
    )
}

function SongControl({ image, eventName, style }: { image: string, eventName: string, style?: CSSProperties }) {
    return <button style={{ ...style, maskImage: `url("${image}")` }} className='icon' onClick={(() => sendToProcess(eventName))}></button>

}

export default App
