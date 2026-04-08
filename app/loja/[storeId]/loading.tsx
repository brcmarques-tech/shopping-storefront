export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] animate-pulse">
      {/* Banner */}
      <div className="w-full h-48 md:h-64 bg-[var(--bg-muted)]" />
      {/* Logo + info */}
      <div className="max-w-4xl mx-auto px-4 -mt-12 pb-4">
        <div className="w-24 h-24 rounded-full bg-[var(--bg-muted)] border-4 border-[var(--bg-card)]" />
        <div className="mt-3 h-6 w-48 bg-[var(--bg-muted)] rounded" />
        <div className="mt-2 h-4 w-32 bg-[var(--bg-muted)] rounded" />
      </div>
      {/* Category nav */}
      <div className="border-b border-[var(--border-color)] px-4 py-3 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-[var(--bg-muted)] rounded-full" />
        ))}
      </div>
      {/* Product grid */}
      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-sm">
            <div className="h-36 bg-[var(--bg-muted)]" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-[var(--bg-muted)] rounded w-3/4" />
              <div className="h-4 bg-[var(--bg-muted)] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
