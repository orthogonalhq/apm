import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CopyButton } from "@/components/copy-button";
import { PanelBar } from "@/components/panel-bar";
import { SkillMdRenderer } from "@/components/skill-md-renderer";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;

  const result = await db
    .select({
      name: schema.packages.name,
      description: schema.packages.description,
    })
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    return { title: "Package not found" };
  }

  const pkg = result[0];
  return {
    title: pkg.name,
    description: pkg.description,
    openGraph: {
      title: `${pkg.name} — APM`,
      description: pkg.description,
    },
  };
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const result = await db
    .select()
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    notFound();
  }

  const pkg = result[0];
  const installCmd = `apm install ${pkg.name}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: pkg.name,
    description: pkg.description,
    codeRepository: `https://github.com/${pkg.sourceRepo}`,
    programmingLanguage: "Markdown",
    license: pkg.license
      ? `https://spdx.org/licenses/${pkg.license}.html`
      : undefined,
  };

  const details = [
    {
      label: "Repo",
      value: pkg.sourceRepo,
      href: `https://github.com/${pkg.sourceRepo}`,
    },
    {
      label: "Path",
      value: pkg.sourcePath,
      href: `https://github.com/${pkg.sourceRepo}/tree/${pkg.sourceRef}/${pkg.sourcePath}`,
    },
    ...(pkg.license ? [{ label: "License", value: pkg.license }] : []),
    { label: "Stars", value: (pkg.repoStars ?? 0).toLocaleString() },
    {
      label: "Owner",
      value: pkg.repoOwner,
      href: `https://github.com/${pkg.repoOwner}`,
    },
    { label: "Indexed", value: pkg.lastIndexedAt.toLocaleDateString() },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
              <span className="bg-accent text-black font-normal px-0.5">
                &gt;
              </span>
              <span className="ml-1.5">Package</span>
            </p>
            <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading">
              {pkg.name}
            </h1>
            <p className="mt-2 text-sm t-card-desc leading-relaxed">
              {pkg.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Install */}
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::install" />
                <div className="px-6 md:px-10 py-5">
                  <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-4 py-3 rounded-[3px]">
                    <span className="font-mono text-xs t-meta select-none">
                      $
                    </span>
                    <code className="font-mono text-sm t-card-title flex-1 overflow-x-auto whitespace-nowrap">
                      {installCmd}
                    </code>
                    <CopyButton text={installCmd} />
                  </div>
                </div>
              </div>

              {/* SKILL.md content */}
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::readme" meta="SKILL.md" />
                <div className="px-6 md:px-10 py-6 md:py-8">
                  <SkillMdRenderer content={pkg.skillMdRaw} />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside>
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::details" />
                <div className="divide-y divide-white/[0.06]">
                  {details.map((item) => (
                    <div
                      key={item.label}
                      className="px-6 md:px-10 lg:px-5 py-3 flex items-baseline justify-between gap-3"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] t-panel-label shrink-0">
                        {item.label}
                      </span>
                      {"href" in item && item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-accent hover:underline truncate text-right"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <span className="font-mono text-xs t-card-desc truncate text-right">
                          {item.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
