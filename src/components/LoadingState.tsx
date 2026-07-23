function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg bg-[var(--gridline)] ${className}`} />;
}

/** Skeleton de carga inicial, mientras se obtienen los datos del backend. */
export function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-[calc(env(safe-area-inset-top)+1rem)] flex flex-col gap-6 sm:mt-[calc(env(safe-area-inset-top)+2rem)]"
    >
      <span className="sr-only">Cargando datos…</span>

      <div className="flex flex-col gap-2" aria-hidden="true">
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-4 w-64 max-w-full" />
      </div>

      <div
        aria-hidden="true"
        className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-card sm:p-6"
      >
        <SkeletonBlock className="h-4 w-48" />
        <SkeletonBlock className="mt-4 h-28 w-full" />
        <SkeletonBlock className="mt-4 h-4 w-56 max-w-full" />
      </div>
    </div>
  );
}
