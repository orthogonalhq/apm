use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;

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

        let skills_dir = root.join(".skills").join(scope).join(name);
        fs::create_dir_all(&skills_dir)
            .with_context(|| format!("Failed to create {}", skills_dir.display()))?;
        fs::write(skills_dir.join("SKILL.md"), &pkg.skill_md_raw)?;

        let (description, kind, dependencies, tags) = parse_frontmatter_metadata(&pkg.skill_md_raw);

        lockfile.add_package(
            full_name,
            &pkg.source_repo,
            &pkg.source_path,
            &pkg.source_ref,
            None,
            description.as_deref(),
            kind.as_deref(),
            dependencies,
            tags,
        );

        println!(" {}", "✓".green());
    }

    lockfile.save(&root)?;
    println!("{} All packages updated", "apm".green().bold());
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
