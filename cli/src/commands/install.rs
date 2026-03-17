use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;

/// Install a single package by scope/name from the registry, including dependencies.
pub async fn run_one(registry: &str, scope: &str, name: &str) -> Result<()> {
    let root = Lockfile::find_root().context("Could not determine project root")?;
    let mut lockfile = Lockfile::load(&root)?;
    let mut visited = HashSet::new();

    install_recursive(registry, scope, name, &root, &mut lockfile, &mut visited).await?;

    lockfile.save(&root)?;
    Ok(())
}

/// Recursively install a package and its dependencies.
async fn install_recursive(
    registry: &str,
    scope: &str,
    name: &str,
    root: &std::path::Path,
    lockfile: &mut Lockfile,
    visited: &mut HashSet<String>,
) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);

    // Circular dependency check
    if !visited.insert(full_name.clone()) {
        return Ok(());
    }

    // Skip if already installed on disk
    if lockfile.packages.contains_key(&full_name) {
        let skills_dir = root.join(".skills").join(scope).join(name);
        if skills_dir.join("SKILL.md").exists() {
            // Already installed — still resolve deps
            let (_, _, dependencies, _) = {
                let content = fs::read_to_string(skills_dir.join("SKILL.md")).unwrap_or_default();
                parse_frontmatter_metadata(&content)
            };
            for dep in &dependencies {
                let stripped = dep.strip_prefix('@').unwrap_or(dep);
                let parts: Vec<&str> = stripped.splitn(2, '/').collect();
                if parts.len() == 2 {
                    Box::pin(install_recursive(
                        registry, parts[0], parts[1], root, lockfile, visited,
                    ))
                    .await?;
                }
            }
            return Ok(());
        }
    }

    println!("{} Fetching {}...", "apm".green().bold(), full_name.cyan());

    let pkg = fetch_package(registry, scope, name).await?;

    let skills_dir = root.join(".skills").join(&pkg.scope).join(&pkg.name);
    write_skill(&skills_dir, &pkg)?;

    let (description, kind, dependencies, tags) = parse_frontmatter_metadata(&pkg.skill_md_raw);
    let integrity = compute_integrity(&pkg.skill_md_raw);

    lockfile.add_package(
        &full_name,
        &pkg.source_repo,
        &pkg.source_path,
        &pkg.source_ref,
        pkg.last_commit_sha.as_deref(),
        Some(&integrity),
        description.as_deref(),
        kind.as_deref(),
        dependencies.clone(),
        tags,
    );

    println!("  {} {}", "✓".green(), full_name.cyan());

    // Recursively install dependencies
    for dep in &dependencies {
        let stripped = dep.strip_prefix('@').unwrap_or(dep);
        let parts: Vec<&str> = stripped.splitn(2, '/').collect();
        if parts.len() != 2 {
            eprintln!("  {} Invalid dependency format: {}", "⚠".yellow(), dep);
            continue;
        }
        Box::pin(install_recursive(
            registry, parts[0], parts[1], root, lockfile, visited,
        ))
        .await?;
    }

    Ok(())
}

/// Install all packages from the lockfile.
pub async fn run_all(registry: &str) -> Result<()> {
    let root = Lockfile::find_root().context("Could not determine project root")?;
    let lockfile = Lockfile::load(&root)?;

    if lockfile.packages.is_empty() {
        println!("{} No packages in lockfile", "apm".green().bold());
        return Ok(());
    }

    println!(
        "{} Installing {} package(s) from lockfile...",
        "apm".green().bold(),
        lockfile.packages.len()
    );

    for (full_name, locked) in &lockfile.packages {
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

        print!("  {} {}...", "↓".cyan(), full_name);
        match fetch_package(registry, scope, name).await {
            Ok(pkg) => {
                // Verify integrity if we have a hash
                if let Some(expected) = &locked.integrity {
                    let actual = compute_integrity(&pkg.skill_md_raw);
                    if &actual != expected {
                        println!(" {}", "⚠".yellow());
                        eprintln!(
                            "    {} Content has changed since lockfile was created.",
                            "WARNING:".yellow().bold()
                        );
                        eprintln!(
                            "    Run {} to review and accept changes.",
                            "apm update".cyan()
                        );
                        if let (Some(old_sha), Some(new_sha)) =
                            (&locked.commit_sha, &pkg.last_commit_sha)
                        {
                            eprintln!(
                                "    Diff: https://github.com/{}/compare/{}...{}",
                                locked.source_repo, old_sha, new_sha
                            );
                        }
                        continue;
                    }
                }

                let skills_dir = root.join(".skills").join(scope).join(name);
                write_skill(&skills_dir, &pkg)?;
                println!(" {}", "✓".green());
            }
            Err(e) => {
                println!(" {}", "✗".red());
                eprintln!("    {}", e);
            }
        }
    }

    println!("{} Done", "apm".green().bold());
    Ok(())
}

async fn fetch_package(registry: &str, scope: &str, name: &str) -> Result<PackageResponse> {
    let full_name = format!("@{}/{}", scope, name);
    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/@{}/{}", registry, scope, name);
    let res = client.get(&url).send().await?;

    if res.status() == 404 {
        anyhow::bail!("Package '{}' not found in the registry", full_name);
    }

    if !res.status().is_success() {
        anyhow::bail!("Registry returned status {}", res.status());
    }

    // Track the download
    let track_url = format!("{}/api/packages/@{}/{}/track", registry, scope, name);
    let _ = client.post(&track_url).send().await;

    Ok(res.json().await?)
}

fn write_skill(skills_dir: &std::path::Path, pkg: &PackageResponse) -> Result<()> {
    fs::create_dir_all(skills_dir)
        .with_context(|| format!("Failed to create {}", skills_dir.display()))?;
    let skill_path = skills_dir.join("SKILL.md");
    fs::write(&skill_path, &pkg.skill_md_raw)?;
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
