import { getPublisher } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import Image from "next/image";
import Link from "next/link";

export async function AuthNav() {
  const publisher = await getPublisher();

  if (!publisher) {
    return (
      <Link
        href="/login"
        className="ml-3 px-3 py-1 rounded-md text-[13px] t-nav hover:text-fg/90 hover:bg-white/[0.04] transition-colors shrink-0"
      >
        Sign in
      </Link>
    );
  }

  const showAdmin = isAdmin(publisher.id);

  return (
    <div className="ml-3 flex items-center gap-2 shrink-0">
      {showAdmin && (
        <Link
          href="/admin-1c08a3"
          className="px-2 py-1 rounded text-[10px] font-mono t-ghost hover:t-meta hover:bg-white/[0.04] transition-colors"
          title="Admin"
        >
          admin
        </Link>
      )}
      <Link href="/dashboard">
        {publisher.avatarUrl ? (
          <Image
            src={publisher.avatarUrl}
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 rounded-full border border-white/[0.08] hover:border-accent/40 transition-colors"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] text-accent font-medium">
            {publisher.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
    </div>
  );
}
