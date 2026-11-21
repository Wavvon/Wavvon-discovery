import type { ReactNode } from "react";
import type { Metadata } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const DEFAULT_DESCRIPTION =
  "An open network for communities that host themselves. Voice, text and end-to-end encrypted messaging across independent servers.";

export default function RootLayout({
  metadata,
  pathname,
  children,
}: {
  metadata: Metadata;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{metadata.title ? `${metadata.title} · Wavvon` : "Wavvon"}</title>
        <meta name="description" content={metadata.description ?? DEFAULT_DESCRIPTION} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/styles.css" />
        <script src="/copy.js" defer />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader pathname={pathname} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
