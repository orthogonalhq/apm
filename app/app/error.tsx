"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-6 md:px-12 lg:px-20 py-20 md:py-28 text-center">
      <div className="mx-auto max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-5">
          <span className="bg-red-500 text-black font-normal px-0.5">
            &gt;
          </span>
          <span className="ml-1.5">Error</span>
        </p>
        <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading mb-3">
          Something went wrong
        </h1>
        <p className="text-sm t-card-desc leading-relaxed mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 font-mono text-xs text-accent hover:underline transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
