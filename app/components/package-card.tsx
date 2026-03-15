import Link from "next/link";
import type { PackageListItem } from "@apm/types";

const kindColors: Record<string, string> = {
  skill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "composite-skill": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  workflow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  app: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function PackageCard({ pkg }: { pkg: PackageListItem }) {
  return (
    <Link
      href={`/packages/${pkg.name}`}
      className="block px-6 md:px-10 py-5 border-b border-white/[0.06] hover:bg-white/[0.02] transition-all duration-200 group"
    >
      {/* Row 1: name + right-side meta */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold t-card-title group-hover:text-accent transition-colors truncate">
              {pkg.name}
            </h3>
            {pkg.verified && (
              <span className="text-accent text-[10px]" title="Verified">
                &#x2713;
              </span>
            )}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${kindColors[pkg.kind] ?? "bg-white/5 text-white/40 border-white/10"}`}
            >
              {pkg.kind}
            </span>
          </div>
          <p className="mt-1 text-[12px] t-card-desc leading-relaxed line-clamp-2">
            {pkg.description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] t-meta shrink-0 font-mono uppercase tracking-wide">
          {pkg.repoStars > 0 && (
            <span>★ {pkg.repoStars.toLocaleString()}</span>
          )}
          {pkg.license && pkg.license !== "NOASSERTION" && (
            <span>{pkg.license}</span>
          )}
        </div>
      </div>

      {/* Row 2: metadata HUD */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono t-meta">
        <span>{pkg.author ?? pkg.repoOwner}</span>
        {pkg.category && (
          <>
            <span className="t-ghost">/</span>
            <span>{pkg.category}</span>
          </>
        )}
        <span className="t-ghost">·</span>
        <span>{(pkg.tokenCount ?? 0).toLocaleString()} tokens</span>
        {pkg.downloadCount > 0 && (
          <>
            <span className="t-ghost">·</span>
            <span>{pkg.downloadCount.toLocaleString()} downloads</span>
          </>
        )}
        {pkg.tags.length > 0 && (
          <>
            <span className="t-ghost">·</span>
            {pkg.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px]"
              >
                {tag}
              </span>
            ))}
            {pkg.tags.length > 3 && (
              <span className="t-ghost">+{pkg.tags.length - 3}</span>
            )}
          </>
        )}
        {pkg.compatibility.length > 0 && (
          <>
            <span className="t-ghost">·</span>
            <span className="t-ghost">{pkg.compatibility.join(", ")}</span>
          </>
        )}
      </div>
    </Link>
  );
}
