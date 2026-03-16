"use client";

import { useRouter } from "next/navigation";
import { useCallback, type MouseEvent } from "react";

export function ScopeLink({
  scope,
  className = "",
}: {
  scope: string;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/packages/@${scope}`);
    },
    [scope, router]
  );

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      className={`cursor-pointer hover:text-accent transition-colors ${className}`}
    >
      @{scope}/
    </span>
  );
}
