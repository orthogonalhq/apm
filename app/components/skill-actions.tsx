"use client";

import { useRef, useCallback } from "react";
import { CopyButton } from "./copy-button";
import { DownloadButton } from "./download-button";

export function SkillActions({
  content,
  packageName,
}: {
  content: string;
  packageName: string;
}) {
  const tracked = useRef(false);

  const track = useCallback(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch(`/api/packages/${encodeURIComponent(packageName)}/track`, {
      method: "POST",
    }).catch(() => {});
  }, [packageName]);

  return (
    <div className="flex items-center gap-2">
      <CopyButton text={content} onAction={track} />
      <DownloadButton
        content={content}
        filename={`${packageName}.SKILL.md`}
        onAction={track}
      />
    </div>
  );
}
