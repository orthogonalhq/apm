"use client";

import { useState, useRef, useEffect } from "react";

const languageNames: Record<string, string> = {
  en: "English", zh: "Chinese", ja: "Japanese", ko: "Korean",
  es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  ru: "Russian", ar: "Arabic", hi: "Hindi", it: "Italian",
  nl: "Dutch", pl: "Polish", tr: "Turkish", vi: "Vietnamese",
  th: "Thai", uk: "Ukrainian", sv: "Swedish", cs: "Czech",
};

function buildFilterHref(
  base: Record<string, string | undefined>,
  key: string,
  value: string | undefined,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) p.set(k, v);
  }
  if (value) {
    p.set(key, value);
  } else {
    p.delete(key);
  }
  return `/packages?${p.toString()}`;
}

export function PackageFilters({
  q,
  sort,
  order,
  kind,
  category,
  license,
  language,
  verified,
  filterOptions,
}: {
  q?: string;
  sort: string;
  order: string;
  kind?: string;
  category?: string;
  license?: string;
  language?: string;
  verified?: string;
  filterOptions: {
    kinds: string[];
    categories: string[];
    licenses: string[];
    languages: string[];
  };
}) {
  const base = { q, sort, order, kind, category, license, language, verified };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
      <FilterSelect
        label="Kind"
        filterKey="kind"
        value={kind}
        options={filterOptions.kinds}
        base={base}
      />
      <FilterSelect
        label="Category"
        filterKey="category"
        value={category}
        options={filterOptions.categories}
        base={base}
      />
      <FilterSelect
        label="License"
        filterKey="license"
        value={license}
        options={filterOptions.licenses}
        base={base}
      />
      <FilterSelect
        label="Language"
        filterKey="language"
        value={language}
        options={filterOptions.languages}
        base={base}
        displayFn={(v) => languageNames[v] ?? v.toUpperCase()}
      />
      <a
        href={buildFilterHref(base, "verified", verified === "true" ? undefined : "true")}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shrink-0 ${
          verified === "true"
            ? "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20"
            : "bg-white/[0.04] border-white/[0.06] t-meta hover:bg-white/[0.06]"
        }`}
      >
        Verified
      </a>
      {(kind || category || license || language || verified) && (
        <a
          href={`/packages?${q ? `q=${encodeURIComponent(q)}&` : ""}sort=${sort}&order=${order}`}
          className="font-mono text-[10px] text-accent hover:underline shrink-0"
        >
          Clear
        </a>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  filterKey,
  value,
  options,
  base,
  displayFn,
}: {
  label: string;
  filterKey: string;
  value?: string;
  options: string[];
  base: Record<string, string | undefined>;
  displayFn?: (value: string) => string;
}) {
  const display = (v: string) => (displayFn ? displayFn(v) : v);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClick, true);
      return () => document.removeEventListener("click", handleClick, true);
    }
  }, [open]);

  if (value) {
    return (
      <a
        href={buildFilterHref(base, filterKey, undefined)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
      >
        {label}: {display(value)}
        <span className="text-[9px] ml-0.5">✕</span>
      </a>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] t-meta hover:bg-white/[0.06] transition-colors"
      >
        {label}
        <span className="text-[9px] opacity-40">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-1 z-50">
          <div className="min-w-[140px] max-h-[240px] overflow-y-auto rounded border border-white/[0.08] bg-[#141414] shadow-xl">
            {options.map((opt) => (
              <a
                key={opt}
                href={buildFilterHref(base, filterKey, opt)}
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 font-mono text-[11px] t-card-desc hover:bg-white/[0.06] hover:text-fg transition-colors"
              >
                {display(opt)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
