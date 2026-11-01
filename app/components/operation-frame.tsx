import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { fontVariables } from "../fonts";
import styles from "../operazioni.module.css";
export function OperationFrame({title,intro,current,children}:{title:string;intro:string;current:string;children:ReactNode}){
  return <main className={`${styles.page} ${fontVariables}`}><SiteHeader compact current={current}/><div className={styles.content}><Link className={styles.back} href="/"><ArrowLeft size={19} aria-hidden="true"/>Home</Link><header className={styles.heading}><h1>{title}</h1><p>{intro}</p></header>{children}</div></main>;
}
