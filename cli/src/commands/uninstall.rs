use crate::lockfile::Lockfile;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;

pub fn run(scope: &str, name: &str) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);

    let root = Lockfile::find_root().context("Could not determine project root")?;
    let skills_dir = root.join(".skills").join(scope).join(name);

    if !skills_dir.exists() {
        anyhow::bail!("Package '{}' is not installed", full_name);
    }

    fs::remove_dir_all(&skills_dir)
        .with_context(|| format!("Failed to remove {}", skills_dir.display()))?;

    // Clean up empty scope directory
    let scope_dir = root.join(".skills").join(scope);
    if scope_dir.exists() && scope_dir.read_dir()?.next().is_none() {
        fs::remove_dir(&scope_dir).ok();
    }

    let mut lockfile = Lockfile::load(&root)?;
    lockfile.remove_package(&full_name);
    lockfile.save(&root)?;

    println!(
        "{} Uninstalled {}",
        "apm".green().bold(),
        full_name.cyan(),
    );

    Ok(())
}
