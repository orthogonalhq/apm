import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://apm.orthg.nl";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "APM — Discover Agent Skills for AI Agents",
    template: "%s — APM",
  },
  description:
    "Discover and install agent skills for code review, testing, deployment, and more. The open registry for SKILL.md — production-ready skills for 34+ AI agent products.",
  alternates: {
    languages: {
      "en": BASE_URL,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    title: "APM — Discover Agent Skills for AI Agents",
    description:
      "Discover and install agent skills for code review, testing, deployment, and more. The open registry for SKILL.md — production-ready skills for 34+ AI agent products.",
    url: BASE_URL,
    siteName: "APM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "APM — Discover Agent Skills for AI Agents",
    description:
      "Discover and install agent skills for code review, testing, deployment, and more. The open registry for SKILL.md — production-ready skills for 34+ AI agent products.",
  },
  other: {
    "application-name": "APM",
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
        <Header authSlot={<AuthNav />} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
