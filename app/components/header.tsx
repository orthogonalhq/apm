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
        <div className="px-6 md:px-12 lg:px-20 h-12 flex items-center gap-0 max-w-7xl mx-auto w-full">
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

              {isLoggedIn ? (
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
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
