import { IBM_Plex_Sans, Sora } from "next/font/google";

/** Font delle pagine con il nuovo design (home, Visibilità AI). */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const fontVariables = `${sora.variable} ${plexSans.variable}`;
