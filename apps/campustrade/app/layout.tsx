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

export const metadata: Metadata = {
  title: "CampusTrade",
  description: "Buy, sell, split. Campus only.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CampusTrade" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
};

// Applied before paint so there's no light flash for dark users.
const themeInit = `try{var t=localStorage.getItem('li-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

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
