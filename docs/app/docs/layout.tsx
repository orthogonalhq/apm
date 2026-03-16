import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{
        title: (
          <span className="font-mono text-sm tracking-[-0.02em]">
            <span className="accent-gradient-text font-semibold">apm</span>
            <span className="ml-1.5 t-nav">docs</span>
          </span>
        ),
        url: "/",
      }}
      sidebar={{
        banner: (
          <div className="px-2 py-1.5 text-xs font-mono t-meta border-b border-white/[0.06]">
            <span className="text-accent mr-1.5">&gt;</span>
            <span className="t-sub-label">docs</span>
          </div>
        ),
      }}
      links={[
        {
          text: "Registry",
          url: "https://apm.orthg.nl",
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
