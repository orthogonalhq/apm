use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;

pub async fn run(registry: &str, name: &str) -> Result<()> {
    println!("{} Fetching {}...", "apm".green().bold(), name.cyan());

    // Fetch package metadata
    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/{}", registry, name);
    let res = client.get(&url).send().await?;

    if res.status() == 404 {
        anyhow::bail!("Package '{}' not found in the registry", name);
    }

    if !res.status().is_success() {
        anyhow::bail!("Registry returned status {}", res.status());
    }

    let pkg: PackageResponse = res.json().await?;

    // Find project root
    let root = Lockfile::find_root().context("Could not determine project root")?;
    let skills_dir = root.join(".skills").join(&pkg.name);

    // Create .skills/<name>/ directory
    fs::create_dir_all(&skills_dir)
        .with_context(|| format!("Failed to create {}", skills_dir.display()))?;

    // Write SKILL.md
    let skill_path = skills_dir.join("SKILL.md");
    fs::write(&skill_path, &pkg.skill_md_raw)?;

    // Update lockfile
    let mut lockfile = Lockfile::load(&root)?;
    lockfile.add_package(
        &pkg.name,
        &pkg.source_repo,
        &pkg.source_path,
        &pkg.source_ref,
        None,
    );
    lockfile.save(&root)?;

    println!(
        "{} Installed {} to {}",
        "apm".green().bold(),
        name.cyan(),
        skills_dir.display()
    );

    Ok(())
}
