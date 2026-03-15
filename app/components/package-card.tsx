import Link from "next/link";
import type { PackageListItem } from "@apm/types";

export function PackageCard({ pkg }: { pkg: PackageListItem }) {
  return (
    <Link
      href={`/packages/${pkg.name}`}
      className="block px-6 md:px-10 py-5 border-b border-white/[0.06] hover:bg-white/[0.02] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-mono text-sm font-semibold t-card-title group-hover:text-accent transition-colors truncate">
            {pkg.name}
          </h3>
          <p className="mt-1 text-[12px] t-card-desc leading-relaxed line-clamp-2">
            {pkg.description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] t-meta shrink-0 font-mono uppercase tracking-wide">
          {pkg.repoStars > 0 && (
            <span>★ {pkg.repoStars.toLocaleString()}</span>
          )}
          {pkg.license && <span>{pkg.license}</span>}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] t-meta font-mono">
        <span>{pkg.repoOwner}</span>
        <span className="t-ghost">/</span>
        <span>{pkg.sourceRepo}</span>
      </div>
    </Link>
  );
}
