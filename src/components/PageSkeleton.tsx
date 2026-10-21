/** Shown the moment you switch pages, while the page's data loads: four pastel tiles shuffling like the logo mark. */
export default function PageSkeleton() {
  return (
    <main className="pb-16" aria-busy="true">
      <div className="grid min-h-[60vh] place-items-center">
        <div className="grid justify-items-center gap-5" role="status">
          <span className="rk-loader" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="text-[14px] text-[var(--ink2)]">Loading…</span>
        </div>
      </div>
    </main>
  );
}
