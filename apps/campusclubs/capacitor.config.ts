import type { CapacitorConfig } from "@capacitor/cli";

// Phase 14.5: remote-load wrapper per the Android-first decision — the APK
// points at the deployed site, no separate codebase. webDir is required by
// Capacitor but unused at runtime while server.url is set.
// appId is renameable until first Play Store publish — locked after that.
const config: CapacitorConfig = {
  appId: "com.lockedin.campusclubs",
  appName: "CampusClubs",
  webDir: "public",
  server: {
    // Load this app's own subdomain (set up post-deploy). Must NOT redirect on
    // the root origin, so use the exact host Vercel serves.
    url: "https://clubs.lockedincampus.online",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#7c3aed", // CampusClubs violet
      launchAutoHide: true,
    },
  },
};

export default config;
