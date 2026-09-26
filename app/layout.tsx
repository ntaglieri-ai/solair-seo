import type { Metadata } from "next";
import "./globals.css";
import { clientConfig, themeToCssVariables } from "../lib/client-config";

export const metadata: Metadata = {
  title: clientConfig.productName,
  description: clientConfig.metaDescription,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <head>
        <style>{`:root { ${themeToCssVariables(clientConfig.theme)} }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
