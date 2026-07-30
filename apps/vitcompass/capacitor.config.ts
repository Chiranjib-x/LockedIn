// Remote-load wrapper (Android-first): the APK points at this app's own
// deployed host. No `import type { CapacitorConfig }` — vitcompass doesn't
// depend on @capacitor/cli, and the CLI reads the exported object regardless.
// VIT Compass is public/PWA-first; an APK is optional, but the config is ready.
const config = {
  appId: "com.lockedin.vitcompass",
  appName: "VIT Compass",
  webDir: "public",
  server: {
    url: "https://map.lockedincampus.online",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0891b2", // VIT Compass teal
      launchAutoHide: true,
    },
  },
};

export default config;
