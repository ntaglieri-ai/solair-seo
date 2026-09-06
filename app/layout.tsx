import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solair SEO",
  description: "Solair SEO",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
