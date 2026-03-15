import { db, schema } from "@/lib/db";

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://apm.sh";

export default async function sitemap() {
  const packages = await db
    .select({
      name: schema.packages.name,
      lastIndexedAt: schema.packages.lastIndexedAt,
    })
    .from(schema.packages);

  const packageUrls = packages.map((pkg) => ({
    url: `${BASE_URL}/packages/${pkg.name}`,
    lastModified: pkg.lastIndexedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/packages`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    ...packageUrls,
  ];
}
