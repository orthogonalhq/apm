use crate::lockfile::Lockfile;
use crate::types::PackageResponse;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;

pub async fn run(registry: &str, scope: &str, name: &str) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);
    println!("{} Fetching {}...", "apm".green().bold(), full_name.cyan());

    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/@{}/{}", registry, scope, name);
    let res = client.get(&url).send().await?;

    if res.status() == 404 {
        anyhow::bail!("Package '{}' not found in the registry", full_name);
    }

    if !res.status().is_success() {
        anyhow::bail!("Registry returned status {}", res.status());
    }

    let pkg: PackageResponse = res.json().await?;

    let root = Lockfile::find_root().context("Could not determine project root")?;
    let skills_dir = root.join(".skills").join(&pkg.scope).join(&pkg.name);

    fs::create_dir_all(&skills_dir)
        .with_context(|| format!("Failed to create {}", skills_dir.display()))?;

    let skill_path = skills_dir.join("SKILL.md");
    fs::write(&skill_path, &pkg.skill_md_raw)?;

    let mut lockfile = Lockfile::load(&root)?;
    lockfile.add_package(
        &full_name,
        &pkg.source_repo,
        &pkg.source_path,
        &pkg.source_ref,
        None,
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
