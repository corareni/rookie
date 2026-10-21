/** Shown the moment you switch pages, while the page's data loads: four pastel tiles shuffling like the logo mark. */
export default function PageSkeleton() {
  return (
    <main className="min-h-[70vh]" aria-busy="true">
      {/* Fixed to the window, so it sits dead centre whatever the page size or scroll position. */}
      <div className="pointer-events-none fixed inset-0 z-10 grid place-items-center">
        <div className="grid justify-items-center gap-[clamp(12px,1.6vw,20px)]" role="status">
          <span className="rk-loader" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="text-[clamp(13px,1.1vw,15px)] text-[var(--ink2)]">Loading…</span>
        </div>
      </div>
    </main>
  );
}
