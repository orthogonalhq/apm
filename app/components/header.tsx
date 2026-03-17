"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SearchTrigger } from "./search-trigger";

export function Header({ authSlot, isLoggedIn }: { authSlot?: React.ReactNode; isLoggedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[rgba(10,10,10,0.80)] backdrop-blur-xl"
            : "border-b border-white/[0.06] bg-bg"
        }`}
      >
        <div className="px-6 md:px-12 lg:px-20 h-12 flex items-center gap-0">
          {/* Logo */}
          <Link
            href="/"
            className="font-mono font-semibold text-sm tracking-[0.12em] uppercase t-heading hover:text-accent transition-colors shrink-0 pr-4 border-r border-white/[0.06] mr-4"
          >
            APM
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden sm:flex items-center gap-1 mr-4">
            <Link
              href="/packages"
              className="px-3 py-1 rounded-md text-[13px] t-nav transition-colors hover:text-fg/90 hover:bg-white/[0.04]"
            >
              Packages
            </Link>
            <a
              href="https://docs.apm.orthg.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-md text-[13px] t-nav transition-colors hover:text-fg/90 hover:bg-white/[0.04]"
            >
              Docs
              <svg className="inline h-3 w-3 ml-0.5 -mt-0.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>

          {/* Search trigger */}
          <SearchTrigger className="flex-1 max-w-xs ml-auto" />

          {/* Auth — desktop */}
          <div className="hidden sm:flex">
            {authSlot}
          </div>

          {/* GitHub — desktop */}
          <a
            href="https://github.com/orthogonalhq/apm"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex ml-3 p-1.5 rounded-md t-meta hover:text-fg/90 hover:bg-white/[0.04] transition-colors shrink-0"
            aria-label="GitHub"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          {/* Auth icon — mobile (always visible) */}
          <div className="sm:hidden">
            {authSlot}
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden ml-2 p-1.5 rounded-md t-meta hover:text-fg/90 hover:bg-white/[0.04] transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40 top-12">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-overlay-in"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative bg-bg border-b border-white/[0.06] animate-dialog-in">
            <div className="px-6 py-4 space-y-1">
              <Link
                href="/packages"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-3 py-2.5 rounded-md text-sm t-nav hover:t-heading hover:bg-white/[0.04] transition-colors"
              >
                Packages
              </Link>
              <a
                href="https://docs.apm.orthg.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2.5 rounded-md text-sm t-nav hover:t-heading hover:bg-white/[0.04] transition-colors"
              >
                Docs
                <svg className="h-3 w-3 ml-1.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {isLoggedIn && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-md text-sm t-nav hover:t-heading hover:bg-white/[0.04] transition-colors"
                >
                  Dashboard
                </Link>
              )}

              <div className="border-t border-white/[0.06] my-2" />

              <a
                href="https://github.com/orthogonalhq/apm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm t-nav hover:t-heading hover:bg-white/[0.04] transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
                <svg className="h-3 w-3 ml-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {isLoggedIn ? (
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center px-3 py-2.5 rounded-md text-sm t-ghost hover:t-nav hover:bg-white/[0.04] transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-md text-sm text-accent hover:bg-accent/10 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
