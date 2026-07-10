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
    url: "https://lockedin-swart-ten.vercel.app",
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
