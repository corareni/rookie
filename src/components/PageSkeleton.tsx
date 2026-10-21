/** Shown the moment you switch pages, while the page's data loads. */
export default function PageSkeleton() {
  return (
    <main className="pb-16" aria-busy="true" aria-label="Loading">
      <div className="puzzle">
        <div className="hero span-7 skel min-h-[220px]" />
        <div className="span-5 skel min-h-[220px] rounded-[var(--r)]" />
      </div>
      <div className="puzzle mt-[var(--gap)]">
        <div className="tile span-8 skel min-h-[260px]" />
        <div className="tile span-4 skel min-h-[260px]" />
      </div>
    </main>
  );
}
