import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

const DESC = "Find your way around VIT — every building, one tap away.";
// This link gets pasted into student group chats; without metadataBase the
// opengraph-image file convention can't resolve to an absolute URL and the link
// previews as a bare URL. Env override so U11 (neutral domain) is a config change.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://map.lockedincampus.online";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "VIT Compass",
  description: DESC,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VIT Compass" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  openGraph: { title: "VIT Compass", description: DESC, url: SITE, siteName: "VIT Compass", type: "website" },
  twitter: { card: "summary_large_image", title: "VIT Compass", description: DESC },
};

export const viewport = {
  themeColor: "#f6f5f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // the map handles its own zoom; block page pinch-zoom
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
