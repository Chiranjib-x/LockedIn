// Remote-load wrapper (Android-first): the APK points at this app's own
// deployed host, no separate codebase. Modelled on campusclubs' config but with
// no `import type { CapacitorConfig }` — gaterunner doesn't depend on
// @capacitor/cli, and the CLI reads the exported object regardless of the type.
// The OAuth deep-link scheme + Supabase allow-listing are registered at
// `cap add android` time (native manifest) — see QUEUE U4.
const config = {
  appId: "com.lockedin.gaterunner",
  appName: "GateRunner",
  webDir: "public",
  server: {
    // This app's own subdomain (set up post-deploy). Must not redirect on the
    // root origin, so use the exact host Vercel serves.
    url: "https://gate.chiranjib.online",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#16a34a", // GateRunner green
      launchAutoHide: true,
    },
  },
};

export default config;
