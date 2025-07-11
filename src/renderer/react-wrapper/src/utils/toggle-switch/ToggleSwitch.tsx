import { InputHTMLAttributes } from "react"
import styles from "./styles.module.css"


export default function ToggleSwitch(props: InputHTMLAttributes<HTMLInputElement>) {
    return <label className={styles["switch"]}>
        <input  {...props} type='checkbox'/>
        <span className={styles['slider']}></span>
    </label>
}