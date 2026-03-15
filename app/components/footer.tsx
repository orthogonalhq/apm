import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-bg mt-auto">
      <div className="px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] py-10 md:py-14">
          {/* Navigate */}
          <div className="pb-6 md:pb-0 md:pr-10">
            <span className="text-[10px] uppercase tracking-[0.2em] t-ghost block mb-3 font-mono">
              &gt; navigate
            </span>
            <div className="space-y-1.5">
              {[
                { label: "Home", href: "/" },
                { label: "Packages", href: "/packages" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-[12px] uppercase tracking-[0.15em] font-mono t-nav transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="py-6 md:py-0 md:px-10">
            <span className="text-[10px] uppercase tracking-[0.2em] t-ghost block mb-3 font-mono">
              &gt; connect
            </span>
            <a
              href="https://github.com/orthogonalhq/apm"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[12px] uppercase tracking-[0.15em] font-mono t-nav transition-colors hover:text-accent"
            >
              GitHub
            </a>
          </div>

          {/* About */}
          <div className="pt-6 md:pt-0 md:pl-10">
            <span className="text-[10px] uppercase tracking-[0.2em] t-ghost block mb-3 font-mono">
              &gt; apm
            </span>
            <p className="text-[12px] t-card-desc leading-relaxed">
              The open source package manager for agent skills.
            </p>
            <p className="text-[12px] t-card-desc leading-relaxed mt-1.5">
              Built on the{" "}
              <a
                href="https://agentskills.io/specification"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                agentskills.io
              </a>{" "}
              standard.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] py-4 flex items-center justify-between">
          <span className="text-[10px] t-ghost font-mono">
            &copy; {new Date().getFullYear()} Orthogonal
          </span>
          <span className="text-[10px] t-ghost font-mono uppercase tracking-[0.2em]">
            MIT
          </span>
        </div>
      </div>
    </footer>
  );
}
