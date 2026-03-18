import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "APM Terms of Service — the rules for using the Agent Package Manager registry and services.",
};

export default function TermsPage() {
  return (
    <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
      <div className="mx-auto max-w-3xl prose-legal">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
          <span className="bg-accent text-black font-normal px-0.5">&gt;</span>
          <span className="ml-1.5">Legal</span>
        </p>
        <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading mb-2">
          Terms of Service
        </h1>
        <p className="text-xs t-meta font-mono mb-10">Effective: March 17, 2026</p>

        <div className="space-y-8 text-sm t-card-desc leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              1. Agreement
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of APM (the &ldquo;Service&rdquo;),
              including the registry at apm.orthg.nl, the APM CLI, and all related APIs.
              The Service is operated by Orthogonal (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            </p>
            <p className="mt-2">
              By accessing or using the Service, you agree to be bound by these Terms. If
              you do not agree, do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              2. What APM Is
            </h2>
            <p>
              APM is an open source package manager and public registry for agent skills,
              composite skills, workflows, and apps built on the{" "}
              <a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                agentskills.io
              </a>{" "}
              open standard. APM indexes public repositories, hosts published packages,
              and provides tools for discovering and installing agent packages.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              3. Your Account
            </h2>
            <p>
              Some features require a publisher account, authenticated via GitHub OAuth.
              You are responsible for all activity under your account. You must not share
              your credentials or API tokens. You must be at least 13 years old to create
              an account.
            </p>
            <p className="mt-2">
              We may suspend or terminate your account if you violate these Terms, with or
              without notice.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service to distribute malware, spyware, or any malicious code</li>
              <li>Publish skills that instruct agents to exfiltrate data, bypass security controls, impersonate users, or perform destructive actions without explicit user consent</li>
              <li>Abuse the API with excessive automated requests beyond published rate limits</li>
              <li>Impersonate another person or organization through scope names or package metadata</li>
              <li>Use the Service to harass, threaten, or intimidate others</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or our infrastructure</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use the Service for any purpose that violates applicable law</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              5. Acceptable Content
            </h2>
            <p>Packages published to or indexed by APM must not contain:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Illegal content under applicable law</li>
              <li>Malicious agent instructions — skills that direct agents to harm users, exfiltrate data, circumvent security measures, or take unauthorized actions</li>
              <li>Deceptive content — skills whose behavior materially differs from their stated description</li>
              <li>Non-functional packages published solely to reserve names</li>
              <li>Content that infringes on the intellectual property rights of others</li>
              <li>Excessive or abusive advertising</li>
            </ul>
            <p className="mt-2">
              <strong className="text-fg/85">Agent skill safety:</strong> Agent skills are
              instructions that AI agents follow. A malicious skill can cause real harm —
              data loss, unauthorized access, or deceptive agent behavior. We take this
              seriously. Skills that instruct agents to act against user interests will be
              removed and the publisher may be banned.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              6. Your Content
            </h2>
            <p>
              You retain ownership of all content you publish to APM. By publishing, you
              grant Orthogonal a non-exclusive, worldwide, royalty-free license to host,
              store, reproduce, display, and distribute your content through the Service —
              including rendering it on package pages, serving it via the API, and indexing
              it for search.
            </p>
            <p className="mt-2">
              You represent that you have the right to publish the content and that it does
              not violate any third party&apos;s rights.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              7. Proxy Indexing
            </h2>
            <p>
              APM automatically indexes public GitHub repositories containing valid
              SKILL.md files. This is public data, equivalent to a search engine indexing
              public web pages. No authorization from the repository owner is required.
            </p>
            <p className="mt-2">
              Repository owners can opt out at any time by adding a{" "}
              <code className="text-accent/80 bg-white/[0.04] px-1 py-0.5 rounded-sm text-xs">.apm-exclude</code>{" "}
              file to their repository root or by contacting us.
              See our <a href="/docs/delisting" className="text-accent hover:underline">delisting documentation</a>.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              8. Takedowns
            </h2>
            <p>
              If you believe content on APM infringes your intellectual property rights,
              please contact us at{" "}
              <a href="mailto:hello@orthg.nl?subject=%5BAPM%5D%5BLegal%5D" className="text-accent hover:underline">hello@orthg.nl</a>{" "}
              with a description of the allegedly infringing content and your claim of ownership.
            </p>
            <p className="mt-2">
              We will respond to valid takedown requests promptly. We reserve the right to
              remove any content at our discretion.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              9. API Usage
            </h2>
            <p>
              The APM API is provided for legitimate package management operations. You
              agree to respect published rate limits. We may throttle or block access that
              we determine to be abusive or excessive.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              10. Disclaimers
            </h2>
            <p>
              The Service is provided <strong className="text-fg/85">&ldquo;as is&rdquo;</strong> and{" "}
              <strong className="text-fg/85">&ldquo;as available&rdquo;</strong> without warranties of
              any kind, express or implied. We do not warrant that the Service will be
              uninterrupted, error-free, or secure. We do not endorse, verify, or guarantee
              the safety or quality of any package published to or indexed by the registry.
            </p>
            <p className="mt-2">
              <strong className="text-fg/85">You are responsible for reviewing agent skills
              before use.</strong> Skills are third-party instructions that agents follow.
              Installing and using a skill is at your own risk.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              11. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Orthogonal&apos;s total liability to you
              for any claims arising from or related to the Service is limited to the
              greater of (a) the amount you paid us in the 12 months preceding the claim,
              or (b) USD $50.
            </p>
            <p className="mt-2">
              We are not liable for any indirect, incidental, special, consequential, or
              punitive damages, including loss of data, revenue, or profits.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              12. Termination
            </h2>
            <p>
              You may stop using the Service at any time. We may suspend or terminate your
              access at any time for any reason, including violation of these Terms.
              Sections 5 (Acceptable Content), 6 (Your Content), 10 (Disclaimers), 11
              (Limitation of Liability), and 14 (Governing Law) survive termination.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              13. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of material
              changes by posting the updated Terms on this page with a new effective date.
              Your continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              14. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the Province of British Columbia, Canada,
              without regard to conflict of law provisions. Any disputes arising from these
              Terms will be resolved in the courts of British Columbia, Canada.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-3">
              15. Contact
            </h2>
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:hello@orthg.nl?subject=%5BAPM%5D%5BLegal%5D" className="text-accent hover:underline">hello@orthg.nl</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
