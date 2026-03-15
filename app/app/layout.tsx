import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://apm.sh";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "APM — Discover Agent Skills for AI Agents",
    template: "%s — APM",
  },
  description:
    "Discover and install agent skills for code review, testing, deployment, and more. The open registry for SKILL.md — production-ready skills for 34+ AI agent products.",
  openGraph: {
    title: "APM — Discover Agent Skills for AI Agents",
    description:
      "Discover and install agent skills for code review, testing, deployment, and more. The open registry for SKILL.md — production-ready skills for 34+ AI agent products.",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "APM",
  url: BASE_URL,
  description:
    "The open registry for agent skills — discover and install production-ready skills for AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-bg antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
