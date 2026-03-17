import { Resend } from "resend";

let client: Resend | undefined;

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    client = new Resend(key);
  }
  return client;
}

const FROM = "APM <hello@email.apm.orthg.nl>";

// ── Shared template ─────────────────────────────────────────

function emailTemplate(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">

    <!-- Header -->
    <div style="margin-bottom: 32px;">
      <span style="font-size: 20px; font-weight: 700; color: #f5f5f5; letter-spacing: 0.04em;">APM</span>
      <span style="font-size: 12px; color: #6b7280; margin-left: 8px;">Agent Package Manager</span>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: #1f1f1f; margin-bottom: 32px;"></div>

    <!-- Body -->
    <div style="color: #d4d4d4; font-size: 14px; line-height: 1.7;">
      ${body}
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: #1f1f1f; margin: 32px 0;"></div>

    <!-- Footer -->
    <div style="font-size: 11px; color: #525252; line-height: 1.6;">
      <a href="https://apm.orthg.nl" style="color: #525252; text-decoration: none;">apm.orthg.nl</a>
      &nbsp;·&nbsp;
      <a href="https://apm.orthg.nl/docs" style="color: #525252; text-decoration: none;">Docs</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/orthogonalhq/apm" style="color: #525252; text-decoration: none;">GitHub</a>
    </div>

  </div>
</body>
</html>`;
}

function cta(text: string, href: string): string {
  return `
    <p style="margin-top: 24px;">
      <a href="${href}" style="display: inline-block; padding: 10px 24px; background: #2563eb; color: #ffffff; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
        ${text}
      </a>
    </p>`;
}

function pill(text: string): string {
  return `<code style="background: #1a1a2e; color: #818cf8; padding: 2px 8px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', Monaco, monospace;">${text}</code>`;
}

// ── Emails ──────────────────────────────────────────────────

export async function sendRequestConfirmation(
  to: string,
  namespaceName: string,
  claimType: "org" | "namespace"
): Promise<void> {
  const typeLabel = claimType === "org" ? "organization and namespace" : "namespace";

  await getClient().emails.send({
    from: FROM,
    to,
    subject: `We received your request for @${namespaceName}`,
    html: emailTemplate(`
      <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 16px 0;">
        Request received
      </h2>
      <p>We've received your request to claim the ${typeLabel} ${pill("@" + namespaceName)} on APM.</p>
      <p>Our team will review your request and verify ownership. You'll receive an email once a decision has been made — typically within 24 hours.</p>
      <p style="margin-top: 20px; padding: 16px; background: #111113; border: 1px solid #1f1f1f; border-radius: 8px; font-size: 13px; color: #a3a3a3;">
        <strong style="color: #d4d4d4;">What happens next?</strong><br/>
        ✓ &nbsp;Your request is in our review queue<br/>
        ✓ &nbsp;You can use APM normally while you wait<br/>
        ✓ &nbsp;Check your dashboard for status updates
      </p>
      ${cta("View your dashboard", "https://apm.orthg.nl/dashboard")}
    `),
  });
}

export async function sendNamespaceApproved(
  to: string,
  orgName: string,
  claimType: "org" | "namespace" = "org"
): Promise<void> {
  const typeLabel = claimType === "org" ? "organization and namespace" : "namespace";

  await getClient().emails.send({
    from: FROM,
    to,
    subject: `Your namespace @${orgName} has been approved ✓`,
    html: emailTemplate(`
      <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 16px 0;">
        Namespace approved
      </h2>
      <p>Your request to claim the ${typeLabel} ${pill("@" + orgName)} on APM has been <strong style="color: #4ade80;">approved</strong>.</p>
      <p>You now have full control of the namespace:</p>
      <div style="margin-top: 16px; padding: 16px; background: #111113; border: 1px solid #1f1f1f; border-radius: 8px; font-size: 13px; color: #a3a3a3; line-height: 2;">
        ✓ &nbsp;Publish and manage skills<br/>
        ✓ &nbsp;Connect GitHub repos for auto-sync<br/>
        ✓ &nbsp;View download analytics<br/>
        ✓ &nbsp;Invite team members<br/>
        ✓ &nbsp;Verified badge on all your skills
      </div>
      ${cta("Go to your namespace", `https://apm.orthg.nl/dashboard/orgs/${orgName}`)}
    `),
  });
}

export async function sendNamespaceRejected(
  to: string,
  orgName: string,
  reason?: string
): Promise<void> {
  const reasonBlock = reason
    ? `
      <div style="margin-top: 16px; padding: 16px; background: #111113; border: 1px solid #1f1f1f; border-radius: 8px; font-size: 13px;">
        <strong style="color: #d4d4d4;">Reason:</strong>
        <p style="margin: 8px 0 0 0; color: #a3a3a3;">${reason}</p>
      </div>`
    : "";

  await getClient().emails.send({
    from: FROM,
    to,
    subject: `Update on your request for @${orgName}`,
    html: emailTemplate(`
      <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 16px 0;">
        Request not approved
      </h2>
      <p>Your request to claim ${pill("@" + orgName)} on APM was not approved at this time.</p>
      ${reasonBlock}
      <p>If you believe this was a mistake, you can reply to this email or <a href="https://github.com/orthogonalhq/apm/issues" style="color: #818cf8; text-decoration: none;">open an issue</a> on the APM repo.</p>
      <p>You can still create a different namespace from your dashboard.</p>
      ${cta("Go to your dashboard", "https://apm.orthg.nl/dashboard")}
    `),
  });
}
