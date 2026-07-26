import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import GateHeader from "@/components/gate-header";
import { RegisterSW } from "@/components/pwa";
import NativeAuthBridge from "@/components/native-auth-bridge";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

const DESC = "Your parcel, picked up at the gate — by a student already walking there.";
// This link gets pasted into student group chats; without metadataBase the
// opengraph-image file convention can't resolve to an absolute URL and the link
// previews as a bare URL. Env override so U11 (neutral domain) is a config change.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gate.chiranjib.online";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Gate Runner",
  description: DESC,
  openGraph: { title: "Gate Runner", description: DESC, url: SITE, siteName: "Gate Runner", type: "website" },
  twitter: { card: "summary_large_image", title: "Gate Runner", description: DESC },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
};

// Applied before paint so there's no light flash for dark users.
const themeInit = `try{var t=localStorage.getItem('gr-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <RegisterSW />
        <NativeAuthBridge />
        <GateHeader />
        {children}
      </body>
    </html>
  );
}
