import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orgMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = {
  title: "Get Started",
};

export default async function OnboardingPage() {
  const publisher = await getPublisher();
  if (!publisher) redirect("/login");

  // If user already has orgs, skip onboarding
  const memberships = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.publisherId, publisher.id))
    .limit(1);

  if (memberships.length > 0) redirect("/dashboard");

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
            <span className="bg-accent text-black font-normal px-0.5">
              &gt;
            </span>
            <span className="ml-1.5">Get Started</span>
          </p>
          <h1 className="font-mono text-xl font-semibold tracking-[-0.02em] t-heading">
            Welcome to APM
          </h1>
          <p className="mt-2 text-sm t-nav">
            Set up your organization and namespace to start publishing.
          </p>
        </div>

        <OnboardingWizard />
      </div>
    </div>
  );
}
