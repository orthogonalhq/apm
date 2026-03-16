use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;
use std::path::Path;
use std::process::Command;

/// Publish a skill to the APM registry.
pub async fn run(registry: &str, scope: &str, path: &str) -> Result<()> {
    let skill_dir = Path::new(path);
    let skill_md_path = if skill_dir.is_dir() {
        skill_dir.join("SKILL.md")
    } else {
        skill_dir.to_path_buf()
    };

    if !skill_md_path.exists() {
        anyhow::bail!(
            "No SKILL.md found at {}\n\n  \
            A skill directory must contain a SKILL.md file.\n  \
            See https://apm.orthg.nl/docs/what-is-skill-md for the format.",
            skill_md_path.display()
        );
    }

    // Read and validate frontmatter has a name
    let content = fs::read_to_string(&skill_md_path)?;
    let name = extract_frontmatter_name(&content).ok_or_else(|| {
        anyhow::anyhow!(
            "SKILL.md is missing a 'name' field in frontmatter.\n\n  \
            Expected format:\n  \
            ---\n  \
            name: my-skill\n  \
            description: What this skill does.\n  \
            ---"
        )
    })?;

    // Detect git remote and relative path
    let (source_repo, source_path, source_ref) = detect_git_source(&skill_md_path)?;

    // Read token
    let token = read_token().ok_or_else(|| {
        anyhow::anyhow!(
            "No authentication token found.\n\n  \
            Set the APM_TOKEN environment variable, or save a token to ~/.apm/token.\n  \
            Create a token at: {}/settings/tokens",
            registry
        )
    })?;

    println!(
        "{} Publishing @{}/{}...",
        "apm".green().bold(),
        scope.cyan(),
        name.cyan()
    );
    println!(
        "  {} {}:{} (ref: {})",
        "→".dimmed(),
        source_repo,
        source_path,
        source_ref
    );

    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/@{}/{}", registry, scope, name);

    let res = client
        .put(&url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "sourceRepo": source_repo,
            "sourcePath": source_path,
            "sourceRef": source_ref,
        }))
        .send()
        .await?;

    if !res.status().is_success() {
        let status = res.status();
        let body: serde_json::Value = res.json().await.unwrap_or_default();
        let error = body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown error");

        let hint = match status.as_u16() {
            401 => format!(
                "\n\n  Your token may be expired or invalid.\n  \
                Create a new one at: {}/settings/tokens",
                registry
            ),
            403 => {
                let msg = error.to_lowercase();
                if msg.contains("permission") {
                    format!(
                        "\n\n  You need the 'publisher' role (or higher) on the '{}' scope.\n  \
                        Ask a scope owner to add you, or claim the scope if it's unclaimed.",
                        scope
                    )
                } else if msg.contains("suspended") {
                    "\n\n  Contact support to resolve scope suspension.".to_string()
                } else if msg.contains("delisted") {
                    format!(
                        "\n\n  Re-publish the package to relist it:\n  \
                        apm publish {} --scope {}",
                        path, scope
                    )
                } else {
                    String::new()
                }
            }
            404 => format!(
                "\n\n  The scope '{}' does not exist. Claim it first:\n  \
                Create a scope at: {}/settings/scopes",
                scope, registry
            ),
            400 => {
                let msg = error.to_lowercase();
                if msg.contains("could not fetch") {
                    format!(
                        "\n\n  The registry could not access the SKILL.md at the source.\n  \
                        Check that:\n  \
                        - The repo '{}' is public on GitHub\n  \
                        - The file exists at '{}' on the '{}' branch\n  \
                        - Your changes are pushed to the remote",
                        source_repo, source_path, source_ref
                    )
                } else if msg.contains("not found in registry") {
                    "\n\n  Publish dependencies before the composite skill.\n  \
                    Dependencies must exist in the registry at publish time."
                        .to_string()
                } else if msg.contains("does not match") {
                    format!(
                        "\n\n  The 'name' field in SKILL.md frontmatter must match '{}'.\n  \
                        Update the frontmatter name or change the --scope/path.",
                        name
                    )
                } else {
                    String::new()
                }
            }
            _ => String::new(),
        };

        anyhow::bail!("{}{}", error, hint);
    }

    println!(
        "{} Published @{}/{}\n",
        "apm".green().bold(),
        scope.cyan(),
        name.cyan()
    );

    Ok(())
}

fn extract_frontmatter_name(content: &str) -> Option<String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }
    let after = &trimmed[3..];
    let end = after.find("---")?;
    let fm = &after[..end];

    let yaml: serde_yaml::Value = serde_yaml::from_str(fm).ok()?;
    yaml.get("name")
        .and_then(|v| v.as_str())
        .map(String::from)
}

fn detect_git_source(skill_md_path: &Path) -> Result<(String, String, String)> {
    let dir = skill_md_path.parent().unwrap_or(Path::new("."));

    // Check git is available
    let git_check = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(dir)
        .output();

    match git_check {
        Err(_) => anyhow::bail!(
            "git is not installed or not in PATH.\n\n  \
            Install git: https://git-scm.com/downloads"
        ),
        Ok(output) if !output.status.success() => anyhow::bail!(
            "'{}' is not inside a git repository.\n\n  \
            apm publish needs a git repo to determine the source URL.\n  \
            Run 'git init' and add a GitHub remote, or specify --source-repo manually.",
            dir.display()
        ),
        _ => {}
    }

    // Get remote URL
    let remote_output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(dir)
        .output()
        .context("Failed to get git remote URL")?;

    if !remote_output.status.success() {
        anyhow::bail!(
            "No git remote 'origin' found.\n\n  \
            Add a GitHub remote:\n  \
            git remote add origin https://github.com/<owner>/<repo>.git"
        );
    }

    let remote_url = String::from_utf8_lossy(&remote_output.stdout)
        .trim()
        .to_string();

    // Parse github remote into owner/repo
    let source_repo = parse_github_remote(&remote_url).ok_or_else(|| {
        anyhow::anyhow!(
            "Could not parse a GitHub repo from remote URL: '{}'\n\n  \
            APM currently supports GitHub-hosted source repos only.\n  \
            Expected format: https://github.com/<owner>/<repo>.git\n  \
            or: git@github.com:<owner>/<repo>.git",
            remote_url
        )
    })?;

    // Get current branch
    let branch_output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(dir)
        .output()?;

    let source_ref = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();

    if source_ref == "HEAD" {
        anyhow::bail!(
            "Git is in detached HEAD state.\n\n  \
            Checkout a branch before publishing:\n  \
            git checkout main"
        );
    }

    // Get relative path from repo root
    let root_output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(dir)
        .output()?;

    let repo_root = String::from_utf8_lossy(&root_output.stdout)
        .trim()
        .to_string();

    let repo_root_path = Path::new(&repo_root);
    let absolute_skill = fs::canonicalize(skill_md_path)?;
    let source_path = absolute_skill
        .strip_prefix(repo_root_path)
        .unwrap_or(skill_md_path)
        .to_string_lossy()
        .replace('\\', "/");

    Ok((source_repo, source_path, source_ref))
}

fn parse_github_remote(url: &str) -> Option<String> {
    // Handle SSH: git@github.com:owner/repo.git
    if let Some(rest) = url.strip_prefix("git@github.com:") {
        let repo = rest.trim_end_matches(".git");
        return Some(repo.to_string());
    }
    // Handle HTTPS: https://github.com/owner/repo.git
    if let Some(rest) = url
        .strip_prefix("https://github.com/")
        .or_else(|| url.strip_prefix("http://github.com/"))
    {
        let repo = rest.trim_end_matches(".git");
        return Some(repo.to_string());
    }
    None
}

fn read_token() -> Option<String> {
    // Check env var first
    if let Ok(token) = std::env::var("APM_TOKEN") {
        if !token.is_empty() {
            return Some(token);
        }
    }

    // Check config file: ~/.apm/token
    let home = dirs::home_dir()?;
    let token_path = home.join(".apm").join("token");
    fs::read_to_string(token_path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
