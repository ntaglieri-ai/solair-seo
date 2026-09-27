"use client";

import Image, { type ImageLoader } from "next/image";

// Energy Hill, Taipei — foto di Anders J su Unsplash (hxUcl0nUsIY)
const PHOTO = "https://images.unsplash.com/photo-1594818379496-da1e345b0ded";

/**
 * Il browser scarica la foto direttamente da Unsplash, nella larghezza che
 * serve allo schermo: niente passaggio dall'ottimizzatore immagini del server.
 */
const unsplashLoader: ImageLoader = ({ src, width, quality }) =>
  `${src}?ixlib=rb-4.1.0&fm=jpg&cs=srgb&q=${quality ?? 75}&w=${width}`;

/** Foto a tutta larghezza della hero; il contenitore deve essere `position: relative`. */
export function HeroPhoto({ className }: { className?: string }) {
  return <Image className={className} loader={unsplashLoader} src={PHOTO} alt="" fill priority sizes="100vw" />;
}
