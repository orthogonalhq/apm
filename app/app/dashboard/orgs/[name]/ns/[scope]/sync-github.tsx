"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Repo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
}

interface SkillFile {
  path: string;
  name: string;
  repo: string;
}

type Step = "idle" | "repos" | "scanning" | "preview" | "importing";

const GitHubIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const Spinner = () => (
  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export function SyncFromGitHub({
  orgName,
  scopeName,
  connectedRepo,
  lastSyncAt,
}: {
  orgName: string;
  scopeName: string;
  connectedRepo?: string | null;
  lastSyncAt?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<Record<string, { scope: string; org: string }>>({});
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [repoFilter, setRepoFilter] = useState("");
  // Track whether we came directly from the resync button (skipped repo picker)
  const [fromResync, setFromResync] = useState(false);

  const fetchRepos = useCallback(async () => {
    setFromResync(false);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/github-repos`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to fetch repos");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRepos(data.repos ?? []);
      setConnectedRepos(data.connectedRepos ?? {});
      setStep("repos");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [orgName]);

  const scanRepo = useCallback(async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    setStep("scanning");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/github-repos/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, scope: scopeName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to scan repo");
        setStep(fromResync ? "idle" : "repos");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSkills(data.skills ?? []);
      setSelected(new Set((data.skills ?? []).map((s: SkillFile) => s.path)));
      setStep("preview");
    } catch {
      setError("Network error");
      setStep(fromResync ? "idle" : "repos");
    }
    setLoading(false);
  }, [orgName, scopeName, fromResync]);

  const handleResync = useCallback(() => {
    if (!connectedRepo) return;
    setFromResync(true);
    scanRepo(connectedRepo);
  }, [connectedRepo, scanRepo]);

  const disconnectRepo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/github-repos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scopeName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to disconnect");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [orgName, scopeName, router]);

  // Esc closes the repo picker
  useEffect(() => {
    if (step !== "repos") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setStep("idle"); setError(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const importSkills = useCallback(async () => {
    if (!selectedRepo || selected.size === 0) return;
    setStep("importing");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/github-repos/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: selectedRepo,
          scope: scopeName,
          paths: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to import");
        setStep("preview");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      setStep("idle");
      router.refresh();
    } catch {
      setError("Network error");
      setStep("preview");
    }
    setLoading(false);
  }, [orgName, scopeName, selectedRepo, selected, router]);

  const toggleSkill = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (step === "idle") {
    const lastSyncLabel = lastSyncAt
      ? new Date(lastSyncAt).toLocaleDateString()
      : null;

    return (
      <div className="space-y-2">
        {result && (
          <p className="text-xs text-green-400 font-mono">
            Imported {result.imported} skill{result.imported !== 1 ? "s" : ""}{result.skipped > 0 ? `, skipped ${result.skipped}` : ""}.
          </p>
        )}

        {connectedRepo ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <GitHubIcon />
                <span className="text-xs font-mono t-heading truncate">{connectedRepo}</span>
              </div>
              {lastSyncLabel && (
                <p className="text-[10px] font-mono t-ghost mt-0.5">Last synced {lastSyncLabel}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleResync}
                disabled={loading}
                className="px-3 py-2 rounded-md bg-white/4 border border-white/6 text-xs font-mono t-meta hover:t-heading hover:border-white/12 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {loading ? <><Spinner /> Scanning...</> : "Resync"}
              </button>
              <button
                onClick={fetchRepos}
                disabled={loading}
                className="text-[11px] font-mono text-white/30 hover:text-white/50 transition-colors disabled:opacity-40"
              >
                Change repo
              </button>
              <button
                onClick={disconnectRepo}
                disabled={loading}
                className="text-[11px] font-mono text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={fetchRepos}
            disabled={loading}
            className="px-3 py-2 rounded-md bg-white/4 border border-white/6 text-xs font-mono t-meta hover:t-heading hover:border-white/12 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            <GitHubIcon />
            {loading ? "Loading..." : "Connect GitHub Repository"}
          </button>
        )}

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
      </div>
    );
  }

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoFilter.toLowerCase()) ||
    r.full_name.toLowerCase().includes(repoFilter.toLowerCase()) ||
    (r.description?.toLowerCase().includes(repoFilter.toLowerCase()) ?? false)
  );

  if (step === "repos") {
    return (
      <div className="space-y-2">
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        {repos.length === 0 ? (
          <p className="text-xs t-nav">No repos found.</p>
        ) : (
          <>
            <input
              type="text"
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              placeholder="Filter repos..."
              className="w-full px-3 py-1.5 rounded bg-white/4 border border-white/8 text-xs t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1 border border-white/6 rounded-lg p-2">
              {filteredRepos.length === 0 ? (
                <p className="text-xs t-ghost px-3 py-2">No matches</p>
              ) : (
                filteredRepos.map((repo) => {
                  const connection = connectedRepos[repo.full_name];
                  const isOwned = !!connection && connection.scope !== scopeName;
                  return (
                    <button
                      key={repo.full_name}
                      onClick={() => !isOwned && scanRepo(repo.full_name)}
                      disabled={isOwned}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${isOwned ? "opacity-40 cursor-not-allowed" : "hover:bg-white/4"}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs t-heading font-mono">{repo.name}</p>
                        {isOwned && (
                          <a
                            href={`/dashboard/orgs/${connection.org}/ns/${connection.scope}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-mono whitespace-nowrap hover:bg-accent/20 transition-colors"
                          >
                            Repo already synced to @{connection.scope}
                          </a>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-[10px] t-ghost truncate">{repo.description}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <button
              onClick={() => { setStep("idle"); setError(""); }}
              className="text-[11px] font-mono t-ghost hover:t-meta transition-colors"
            >
              &larr; Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div className="text-xs t-meta font-mono flex items-center gap-2">
        <Spinner />
        Scanning {selectedRepo} for SKILL.md files...
      </div>
    );
  }

  if (step === "preview") {
    const backStep = fromResync ? "idle" : "repos";
    return (
      <div className="space-y-3">
        <p className="text-xs t-nav">
          Found {skills.length} SKILL.md file{skills.length !== 1 ? "s" : ""} in <span className="font-mono t-heading">{selectedRepo}</span>
        </p>
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        {skills.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs t-ghost">No SKILL.md files found in this repository.</p>
            <button
              onClick={() => { setStep(backStep); setError(""); }}
              className="text-[11px] font-mono t-ghost hover:t-meta transition-colors"
            >
              &larr; {fromResync ? "Cancel" : "Pick a different repo"}
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-white/6 rounded-lg p-2">
              {skills.map((skill) => (
                <label
                  key={skill.path}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/4 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(skill.path)}
                    onChange={() => toggleSkill(skill.path)}
                    className="accent-accent"
                  />
                  <div className="min-w-0">
                    <p className="text-xs t-heading font-mono">{skill.name}</p>
                    <p className="text-[10px] t-ghost truncate">{skill.path}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={importSkills}
                disabled={selected.size === 0}
                className="px-4 py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {selected.size} skill{selected.size !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => { setStep(backStep); setError(""); }}
                className="text-[11px] font-mono t-ghost hover:t-meta transition-colors"
              >
                &larr; {fromResync ? "Cancel" : "Back"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // importing
  return (
    <div className="text-xs t-meta font-mono flex items-center gap-2">
      <Spinner />
      Importing {selected.size} skill{selected.size !== 1 ? "s" : ""}...
    </div>
  );
}
