import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublisher } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publisher = await getPublisher();
  if (!publisher || !isAdmin(publisher.id)) redirect("/");

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-3xl">
      <h1 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-6">
        Admin
      </h1>
      <nav className="flex gap-1 mb-8 border-b border-white/[0.06] pb-px">
        <AdminTab href="/admin-1c08a3">Pending</AdminTab>
        <AdminTab href="/admin-1c08a3/approved">Approved</AdminTab>
        <AdminTab href="/admin-1c08a3/rejected">Rejected</AdminTab>
      </nav>
      {children}
    </div>
  );
}

function AdminTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-t text-xs font-mono t-meta hover:t-heading hover:bg-white/[0.04] transition-colors"
    >
      {children}
    </Link>
  );
}
