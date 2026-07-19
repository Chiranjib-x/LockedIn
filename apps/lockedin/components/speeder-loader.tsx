import styles from "./speeder-loader.module.css";

// Route-transition loader (user-picked uiverse speeder, tokenized in the
// module css). Content-shaped skeletons still win inside pages; this is for
// whole-route waits via app/loading.tsx.
export default function SpeederLoader({ label = "Hang tight…" }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      <div className={styles.scene}>
        <div className={styles.loader}>
          <span>
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className={styles.base}>
            <span />
            <div className={styles.face} />
          </div>
        </div>
        <div className={styles.longfazers}>
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
