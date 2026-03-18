export default function DashboardLoading() {
  return (
    <div className="px-6 md:px-12 lg:px-20 max-w-7xl mx-auto py-10 md:py-14">
      <div className="animate-pulse space-y-6">
        {/* Profile skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/[0.06] rounded" />
            <div className="h-3 w-48 bg-white/[0.04] rounded" />
          </div>
        </div>

        {/* Section skeleton */}
        <div className="border border-white/[0.06] rounded-lg bg-surface p-6 space-y-4">
          <div className="h-3 w-24 bg-white/[0.06] rounded" />
          <div className="space-y-3">
            <div className="h-10 bg-white/[0.04] rounded" />
            <div className="h-10 bg-white/[0.04] rounded" />
          </div>
        </div>

        {/* Section skeleton */}
        <div className="border border-white/[0.06] rounded-lg bg-surface p-6 space-y-4">
          <div className="h-3 w-32 bg-white/[0.06] rounded" />
          <div className="space-y-3">
            <div className="h-10 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
