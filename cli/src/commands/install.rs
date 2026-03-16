use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;

/// Install a single package by scope/name from the registry.
pub async fn run_one(registry: &str, scope: &str, name: &str) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);
    println!("{} Fetching {}...", "apm".green().bold(), full_name.cyan());

    let root = Lockfile::find_root().context("Could not determine project root")?;
    let pkg = fetch_package(registry, scope, name).await?;

    let skills_dir = root.join(".skills").join(&pkg.scope).join(&pkg.name);
    write_skill(&skills_dir, &pkg)?;

    let (description, kind, dependencies, tags) = parse_frontmatter_metadata(&pkg.skill_md_raw);

    let mut lockfile = Lockfile::load(&root)?;
    lockfile.add_package(
        &full_name,
        &pkg.source_repo,
        &pkg.source_path,
        &pkg.source_ref,
        None,
        description.as_deref(),
        kind.as_deref(),
        dependencies,
        tags,
    );
    lockfile.save(&root)?;

    println!(
        "{} Installed {} to {}",
        "apm".green().bold(),
        full_name.cyan(),
        skills_dir.display()
    );

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

    for full_name in lockfile.packages.keys() {
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

    Ok(res.json().await?)
}

fn write_skill(skills_dir: &std::path::Path, pkg: &PackageResponse) -> Result<()> {
    fs::create_dir_all(skills_dir)
        .with_context(|| format!("Failed to create {}", skills_dir.display()))?;
    let skill_path = skills_dir.join("SKILL.md");
    fs::write(&skill_path, &pkg.skill_md_raw)?;
    Ok(())
}

/// Extract description, kind, dependencies, and tags from SKILL.md frontmatter.
fn parse_frontmatter_metadata(content: &str) -> (Option<String>, Option<String>, Vec<String>, Vec<String>) {
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
