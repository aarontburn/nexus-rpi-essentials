import { CSSProperties, useEffect, useState } from 'react'
import styles from './styles.module.css'
import next from "../../assets/next.svg";
import pause from "../../assets/pause.svg";
import play from "../../assets/play.svg";
import previous from "../../assets/previous.svg";
import { Spacer } from '../../components';
import { addProcessListener, sendToProcess } from '../../nexus-bridge';

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
    const [isConnected, setIsConnected] = useState<boolean>(false);

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
            }
        });
        return () => window.removeEventListener("message", listener);
    }, []);


    return (
        <div className={styles['container']}>
            {
                isConnected
                    ? <div className={styles['song-metadata']}>
                        <h1 className={styles['title']}>{!currentSong ? "No song playing" : currentSong.title}</h1>
                        <h2 className={styles['album']}>{currentSong?.album}</h2>
                        <Spacer />
                        <h3 className={styles['artist']}>{currentSong?.artist}</h3>
                        {currentSong && <h3 className={styles['time']}>{currentSong?.position}/{currentSong?.duration}</h3>}
                    </div>
                    : <h1>Disconnected</h1>
            }

            <Spacer size='32px' />


            <div className={styles['song-controls']}>
                <div className={styles['row-1']}>
                    <SongControl image={previous} eventName='previous' />
                    <SongControl image={isPlaying ? pause : play} eventName='play-pause' />
                    <SongControl image={next} eventName='next' />
                </div>

            </div>

        </div>
    )
}

function SongControl({ image, eventName, style }: { image: string, eventName: string, style?: CSSProperties }) {
    return <button style={{ ...style, maskImage: `url("${image}")` }} className={styles['icon']} onClick={(() => sendToProcess(`media-${eventName}`))}></button>

}

export default App
