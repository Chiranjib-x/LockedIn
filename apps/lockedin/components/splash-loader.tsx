import styles from "./splash-loader.module.css";

// Full-screen branded splash. Use on app launch (PWA/Android open), not for
// inline content loading — skeletons are the better UX there.
export default function SplashLoader({ label = "LockedIn" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background">
      <div className={styles.loader}>
        <div className={styles.box} />
        <svg className={styles.svg} viewBox="0 0 100 100">
          <mask id="campus-clip">
            {/* Blurred + high-contrast rotating polygons → morphing metaball. */}
            <polygon fill="#fff" points="50,18 66,44 50,52 38,40" />
            <polygon fill="#fff" points="50,34 64,50 50,66 36,50" />
            <polygon fill="#fff" points="42,44 58,44 54,64 46,64" />
            <polygon fill="#fff" points="34,38 52,42 48,58 32,54" />
            <polygon fill="#fff" points="36,40 50,36 56,52 40,58" />
            <polygon fill="#fff" points="52,36 68,44 60,60 50,52" />
            <polygon fill="#fff" points="48,40 64,46 58,58 46,56" />
          </mask>
          <rect width="100" height="100" fill="#fff" mask="url(#campus-clip)" />
        </svg>
      </div>
      <p className="font-heading text-lg font-bold tracking-tight text-primary">{label}</p>
    </div>
  );
}
