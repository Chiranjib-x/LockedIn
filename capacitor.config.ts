import type { CapacitorConfig } from "@capacitor/cli";

// Phase 14.5: remote-load wrapper per the Android-first decision — the APK
// points at the deployed site, no separate codebase. webDir is required by
// Capacitor but unused at runtime while server.url is set.
// appId is renameable until first Play Store publish — locked after that.
const config: CapacitorConfig = {
  appId: "com.lockedin.campus",
  appName: "LockedIn",
  webDir: "public",
  server: {
    // Canonical custom domain. The .vercel.app alias still resolves, so the
    // already-distributed APK keeps working; a rebuilt APK will load this.
    // Only rebuild the APK AFTER chiranjib.online is verified live on Vercel.
    url: "https://chiranjib.online",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#2251C7", // cobalt token, inlined — no CSS pipeline in native config
      launchAutoHide: true,
    },
  },
};

export default config;
