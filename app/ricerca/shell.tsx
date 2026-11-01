import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "../components/site-header";
import { fontVariables } from "../fonts";
import styles from "./research.module.css";
export function ResearchTabs({current}:{current:string}){
  return <nav className={styles.tabs} aria-label="Aree di ricerca">{[{href:"/ricerca",label:"Keyword"},{href:"/ricerca/concorrenti",label:"Concorrenti"},{href:"/ricerca/backlink",label:"Backlink"},{href:"/visibilita-ai",label:"Visibilità AI"}].map(link=><Link href={link.href} key={link.href} aria-current={current===link.href?"page":undefined}>{link.label}</Link>)}</nav>;
}
export function ResearchShell({title,intro,current,children}:{title:string;intro:string;current:string;children:ReactNode}){
  return <main className={`${styles.page} ${fontVariables}`}><SiteHeader compact current="/ricerca"/><div className={styles.content}><Link href="/" className={styles.back}><ArrowLeft size={18} aria-hidden/>Home</Link><header className={styles.heading}><h1>{title}</h1><p>{intro}</p></header><ResearchTabs current={current}/>{children}</div></main>;
}
