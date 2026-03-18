import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "APM Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
      <div className="mx-auto max-w-3xl prose-legal">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
          <span className="bg-accent text-black font-normal px-0.5">&gt;</span>
          <span className="ml-1.5">Legal</span>
        </p>
        <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs t-meta font-mono mb-10">Effective: March 17, 2026</p>

        <div className="space-y-8 text-sm t-card-desc leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              1. Who We Are
            </h2>
            <p>
              APM (Agent Package Manager) is operated by Orthogonal (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
              This policy describes how we collect, use, and protect information when you
              use the APM registry, website, CLI, and APIs (collectively, the &ldquo;Service&rdquo;).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              2. What We Collect
            </h2>

            <h3 className="font-mono text-[11px] t-panel-label mt-4 mb-2">Account information</h3>
            <p>
              When you create a publisher account via GitHub OAuth, we receive and store
              your GitHub user ID, username, display name, email address, and avatar URL.
              We do not receive or store your GitHub password.
            </p>

            <h3 className="font-mono text-[11px] t-panel-label mt-4 mb-2">Package data</h3>
            <p>
              When you publish a package, we store the SKILL.md content, frontmatter
              metadata, and source repository information. For indexed packages, we store
              the same data as retrieved from public GitHub repositories.
            </p>

            <h3 className="font-mono text-[11px] t-panel-label mt-4 mb-2">Usage data</h3>
            <p>
              We collect aggregate, anonymized usage data including page views, search
              queries, package download counts, and API request volumes. We collect IP
              addresses for rate limiting and abuse prevention; these are not linked to
              accounts or stored long-term.
            </p>

            <h3 className="font-mono text-[11px] t-panel-label mt-4 mb-2">CLI telemetry</h3>
            <p>
              The APM CLI does not collect telemetry. It makes API requests to the registry
              to perform package operations. The registry logs these requests as described
              above.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              3. What We Do Not Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not use third-party advertising trackers</li>
              <li>We do not sell, rent, or trade your personal information</li>
              <li>We do not use tracking cookies beyond functional session cookies</li>
              <li>We do not collect the content of your private repositories</li>
              <li>We do not monitor which skills you install locally</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              4. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-fg/85">Authentication</strong> — to verify your identity and manage your publisher account</li>
              <li><strong className="text-fg/85">Service operation</strong> — to host, display, and distribute packages you publish</li>
              <li><strong className="text-fg/85">Abuse prevention</strong> — to enforce rate limits and detect automated abuse</li>
              <li><strong className="text-fg/85">Aggregate analytics</strong> — to understand how the Service is used and improve it</li>
              <li><strong className="text-fg/85">Communication</strong> — to notify you about your account, scope ownership, or policy changes</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              5. Public Data
            </h2>
            <p>
              The following data is public by design and visible to anyone:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Package names, descriptions, and metadata</li>
              <li>SKILL.md content</li>
              <li>Publisher usernames and scope names</li>
              <li>Source repository URLs</li>
              <li>Download counts and other aggregate metrics</li>
            </ul>
            <p className="mt-2">
              This is inherent to how a public package registry works. Do not publish
              information you wish to keep private.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              6. Third-Party Services
            </h2>
            <p>We use the following third-party services to operate APM:</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-4 font-mono uppercase tracking-wider t-panel-label">Service</th>
                    <th className="text-left py-2 pr-4 font-mono uppercase tracking-wider t-panel-label">Purpose</th>
                    <th className="text-left py-2 font-mono uppercase tracking-wider t-panel-label">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">Hosting, edge network</td>
                    <td className="py-2">Request logs, IP addresses</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Neon</td>
                    <td className="py-2 pr-4">PostgreSQL database</td>
                    <td className="py-2">All registry data</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">GitHub</td>
                    <td className="py-2 pr-4">OAuth, code search, source fetching</td>
                    <td className="py-2">OAuth tokens, public repo data</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Each service has its own privacy policy. We select providers that maintain
              appropriate security practices.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              7. Data Retention
            </h2>
            <p>
              <strong className="text-fg/85">Account data:</strong> Retained while your
              account is active. If you delete your account, we remove your personal
              information within 30 days. Published packages may remain in the registry
              unless you explicitly unpublish them before deleting your account.
            </p>
            <p className="mt-2">
              <strong className="text-fg/85">Indexed packages:</strong> Proxy-indexed
              packages are retained until the source repository removes the SKILL.md file,
              the repo becomes private, or the owner opts out via{" "}
              <code className="text-accent/80 bg-white/[0.04] px-1 py-0.5 rounded-sm text-xs">.apm-exclude</code>.
            </p>
            <p className="mt-2">
              <strong className="text-fg/85">Access logs:</strong> IP addresses in access
              logs are retained for up to 30 days for abuse prevention, then deleted.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              8. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-fg/85">Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong className="text-fg/85">Correction</strong> — request correction of inaccurate data</li>
              <li><strong className="text-fg/85">Deletion</strong> — request deletion of your account and personal data</li>
              <li><strong className="text-fg/85">Export</strong> — request an export of your data in a machine-readable format</li>
              <li><strong className="text-fg/85">Opt out</strong> — opt out of proxy indexing via <code className="text-accent/80 bg-white/[0.04] px-1 py-0.5 rounded-sm text-xs">.apm-exclude</code></li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:hello@orthg.nl?subject=%5BAPM%5D%5BPrivacy%5D" className="text-accent hover:underline">hello@orthg.nl</a>.
              We will respond within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              9. Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to protect
              your data, including encryption in transit (HTTPS/TLS), encrypted database
              connections, and access controls on our infrastructure. No system is
              perfectly secure — if you discover a vulnerability, please report it to{" "}
              <a href="mailto:hello@orthg.nl?subject=%5BAPM%5D%5BSecurity%5D" className="text-accent hover:underline">hello@orthg.nl</a>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              10. Children
            </h2>
            <p>
              The Service is not directed at children under 13. We do not knowingly collect
              personal information from children under 13. If you believe a child has
              provided us with personal information, contact us and we will delete it.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by posting the updated policy on this page with a new
              effective date. Your continued use of the Service after changes constitutes
              acceptance.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              12. Contact
            </h2>
            <p>
              Questions about this Privacy Policy? Contact us at{" "}
              <a href="mailto:hello@orthg.nl?subject=%5BAPM%5D%5BPrivacy%5D" className="text-accent hover:underline">hello@orthg.nl</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
