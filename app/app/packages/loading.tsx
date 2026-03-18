export default function PackagesLoading() {
  return (
    <div className="px-6 md:px-12 lg:px-20 max-w-7xl mx-auto py-10 md:py-14">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-5 w-40 bg-white/[0.06] rounded" />
          <div className="h-3 w-64 bg-white/[0.04] rounded" />
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-white/[0.04] rounded" />
          <div className="h-9 w-28 bg-white/[0.04] rounded" />
          <div className="h-9 w-28 bg-white/[0.04] rounded" />
        </div>

        {/* Package grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border border-white/[0.06] rounded-lg bg-surface p-5 space-y-3"
            >
              <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
              <div className="h-3 w-full bg-white/[0.04] rounded" />
              <div className="h-3 w-2/3 bg-white/[0.04] rounded" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-12 bg-white/[0.04] rounded-full" />
                <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
