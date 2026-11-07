import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { fontVariables } from "../fonts";
import styles from "../operazioni.module.css";
export function OperationFrame({title,intro,current,children}:{title:string;intro:string;current:string;children:ReactNode}){
  return <main className={`${styles.page} ${fontVariables}`}><SiteHeader compact current={current}/><div className={styles.content}><header className={styles.heading}><h1>{title}</h1><p>{intro}</p></header>{children}</div></main>;
}
