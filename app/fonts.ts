import localFont from "next/font/local";

/** Font delle pagine con il nuovo design (home, Visibilità AI). */
export const sora = localFont({
  src: "./font-assets/sora-latin.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-sora",
});

export const plexSans = localFont({
  src: "./font-assets/ibm-plex-sans-latin.woff2",
  weight: "100 700",
  display: "swap",
  variable: "--font-plex",
});

export const fontVariables = `${sora.variable} ${plexSans.variable}`;
