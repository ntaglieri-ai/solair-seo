"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./site-header.module.css";

type MenuItem = { label: string; href: string };

/** Navigazione espandibile nella variante compatta e su mobile. */
export function SiteMenu({
  items,
  current,
  domain,
}: {
  items: MenuItem[];
  /** href della pagina aperta, evidenziata nel menu. */
  current?: string;
  domain: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc chiude il pannello aperto.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  return (
    <div className={styles.menu} ref={menuRef}>
      <button
        type="button"
        ref={buttonRef}
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Chiudi il menu" : "Apri il menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav
        id="site-menu"
        className={`${styles.topnav} ${open ? styles.topnavOpen : ""}`}
        aria-label="Navigazione principale"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === current ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
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
