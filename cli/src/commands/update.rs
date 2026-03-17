use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{self, BufRead, Write};

/// Re-fetch latest versions for all installed packages and update the lockfile.
pub async fn run(registry: &str) -> Result<()> {
    let root = Lockfile::find_root().context("Could not determine project root")?;
    let mut lockfile = Lockfile::load(&root)?;

    if lockfile.packages.is_empty() {
        println!("{} No packages installed", "apm".green().bold());
        return Ok(());
    }

    let package_names: Vec<String> = lockfile.packages.keys().cloned().collect();

    println!(
        "{} Updating {} package(s)...",
        "apm".green().bold(),
        package_names.len()
    );

    let client = reqwest::Client::new();

    for full_name in &package_names {
        let stripped = full_name.strip_prefix('@').unwrap_or(full_name);
        let parts: Vec<&str> = stripped.splitn(2, '/').collect();
        if parts.len() != 2 {
            eprintln!(
                "{} Skipping invalid entry: {}",
                "apm".yellow().bold(),
                full_name
            );
            continue;
        }
        let (scope, name) = (parts[0], parts[1]);

        print!("  {} {}...", "↑".cyan(), full_name);

        let url = format!("{}/api/packages/@{}/{}", registry, scope, name);
        let res = match client.get(&url).send().await {
            Ok(r) => r,
            Err(e) => {
                println!(" {}", "✗".red());
                eprintln!("    {}", e);
                continue;
            }
        };

        if !res.status().is_success() {
            println!(" {}", "✗".red());
            eprintln!("    Registry returned status {}", res.status());
            continue;
        }

        let pkg: PackageResponse = match res.json().await {
            Ok(p) => p,
            Err(e) => {
                println!(" {}", "✗".red());
                eprintln!("    {}", e);
                continue;
            }
        };

        let new_integrity = compute_integrity(&pkg.skill_md_raw);
        let old_integrity = lockfile.packages.get(full_name).and_then(|e| e.integrity.clone());
        let old_sha = lockfile.packages.get(full_name).and_then(|e| e.commit_sha.clone());
        let old_source_repo = lockfile.packages.get(full_name).map(|e| e.source_repo.clone());
        let new_sha = pkg.last_commit_sha.as_deref();
        let source_repo = old_source_repo.as_deref().unwrap_or(&pkg.source_repo);

        // Check if content changed
        let changed = match &old_integrity {
            Some(old) => old != &new_integrity,
            None => true, // No previous hash — treat as changed (first time pinning)
        };

        if changed && old_integrity.is_some() {
            println!(" {}", "⚠".yellow());
            eprintln!(
                "    {} Content has changed.",
                "CHANGED:".yellow().bold()
            );
            if let (Some(old_s), Some(new_s)) = (&old_sha, new_sha) {
                eprintln!(
                    "    Diff: https://github.com/{}/compare/{}...{}",
                    source_repo, &old_s[..7.min(old_s.len())], &new_s[..7.min(new_s.len())]
                );
            }

            // Prompt user
            print!("    Accept changes? (y/N) ");
            io::stdout().flush()?;
            let mut input = String::new();
            io::stdin().lock().read_line(&mut input)?;
            let answer = input.trim().to_lowercase();

            if answer != "y" && answer != "yes" {
                eprintln!("    Skipped.");
                continue;
            }
        }

        // Track the download
        let track_url = format!("{}/api/packages/@{}/{}/track", registry, scope, name);
        let _ = client.post(&track_url).send().await;

        let skills_dir = root.join(".skills").join(scope).join(name);
        fs::create_dir_all(&skills_dir)
            .with_context(|| format!("Failed to create {}", skills_dir.display()))?;
        fs::write(skills_dir.join("SKILL.md"), &pkg.skill_md_raw)?;

        let (description, kind, dependencies, tags) =
            parse_frontmatter_metadata(&pkg.skill_md_raw);

        lockfile.add_package(
            full_name,
            &pkg.source_repo,
            &pkg.source_path,
            &pkg.source_ref,
            pkg.last_commit_sha.as_deref(),
            Some(&new_integrity),
            description.as_deref(),
            kind.as_deref(),
            dependencies,
            tags,
        );

        if changed && old_integrity.as_ref().is_some() {
            println!("    {} Updated", "✓".green());
        } else {
            println!(" {}", "✓".green());
        }
    }

    lockfile.save(&root)?;
    println!("{} All packages updated", "apm".green().bold());
    Ok(())
}

fn compute_integrity(content: &str) -> String {
    let hash = Sha256::digest(content.as_bytes());
    format!("sha256-{}", hex::encode(hash))
}

/// Extract description, kind, dependencies, and tags from SKILL.md frontmatter.
fn parse_frontmatter_metadata(
    content: &str,
) -> (Option<String>, Option<String>, Vec<String>, Vec<String>) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (None, None, Vec::new(), Vec::new());
    }
    let after_first = &trimmed[3..];
    let end = match after_first.find("---") {
        Some(e) => e,
        None => return (None, None, Vec::new(), Vec::new()),
    };
    let fm = &after_first[..end];

    let yaml: serde_yaml::Value = match serde_yaml::from_str(fm) {
        Ok(v) => v,
        Err(_) => return (None, None, Vec::new(), Vec::new()),
    };

    let description = yaml
        .get("description")
        .and_then(|v| v.as_str())
        .map(String::from);

    let kind = yaml
        .get("kind")
        .and_then(|v| v.as_str())
        .map(String::from);

    let dependencies = yaml
        .get("dependencies")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let tags = yaml
        .get("tags")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    (description, kind, dependencies, tags)
}
