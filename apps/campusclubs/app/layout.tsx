import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import BottomNav from "@/components/bottom-nav";
import { RegisterSW } from "@/components/pwa";
import NativeAuthBridge from "@/components/native-auth-bridge";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const DESC = "Run your club, all in one place.";
// This link gets pasted into student group chats; without metadataBase the
// opengraph-image file convention can't resolve to an absolute URL and the link
// previews as a bare URL. Env override so U11 (neutral domain) is a config change.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clubs.chiranjib.online";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "CampusClubs",
  description: DESC,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CampusClubs" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  openGraph: { title: "CampusClubs", description: DESC, url: SITE, siteName: "CampusClubs", type: "website" },
  twitter: { card: "summary_large_image", title: "CampusClubs", description: DESC },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
};

// Applied before paint so a dark-mode user never sees a light flash.
//
// LIGHT IS THE DEFAULT. This used to fall back to the OS preference, so
// every student whose phone is in dark mode landed in dark without ever
// choosing it — and the design system's identity is warm cream paper.
// Dark now requires an explicit choice: 'dark', or 'system' to opt back
// into following the OS. An absent key means light.
const themeInit = `try{var t=localStorage.getItem('li-theme');var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-24">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <RegisterSW />
        <NativeAuthBridge />
        <Header />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
