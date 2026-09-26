"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../home.module.css";

type MenuItem = { label: string; href: string };

/**
 * Menu della home. Sopra i 900px le voci sono sempre visibili; sotto diventa
 * un pulsante hamburger che apre il pannello delle voci.
 */
export function HomeMenu({ items, domain }: { items: MenuItem[]; domain: string }) {
  const [open, setOpen] = useState(false);

  // Esc chiude il pannello aperto.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.menu}>
      <button
        type="button"
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls="home-menu"
        aria-label={open ? "Chiudi il menu" : "Apri il menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav
        id="home-menu"
        className={`${styles.topnav} ${open ? styles.topnavOpen : ""}`}
        aria-label="Navigazione principale"
      >
        {items.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        <a
          className={styles.domainBadge}
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {domain}
        </a>
      </nav>
    </div>
  );
}
