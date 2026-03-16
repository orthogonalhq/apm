import { getPublisher } from "@/lib/auth/session";
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

  return (
    <Link
      href="/settings"
      className="ml-3 flex items-center gap-2 shrink-0"
    >
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
  );
}
