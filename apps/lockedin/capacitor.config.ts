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
    // Load the primary host DIRECTLY (www is primary in Vercel; the bare apex
    // 308-redirects to it). A Capacitor server.url must not redirect on the
    // app's root origin, so we point at www, not the apex. The .vercel.app
    // alias still resolves, so the previously-distributed APK keeps working.
    url: "https://www.lockedincampus.online",
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
