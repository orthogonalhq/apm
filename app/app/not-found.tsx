import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist on APM.",
};

export default function NotFound() {
  return (
    <div className="px-6 md:px-12 lg:px-20 py-20 md:py-28 text-center">
      <div className="mx-auto max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-5">
          <span className="bg-accent text-black font-normal px-0.5">
            &gt;
          </span>
          <span className="ml-1.5">404</span>
        </p>
        <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading mb-3">
          Page not found
        </h1>
        <p className="text-sm t-card-desc leading-relaxed mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-accent hover:underline transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
