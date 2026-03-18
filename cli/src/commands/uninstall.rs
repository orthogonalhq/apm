use crate::lockfile::Lockfile;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;
use std::io::{self, Write};

pub fn run(scope: &str, name: &str) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);

    let root = Lockfile::find_root().context("Could not determine project root")?;
    let skills_dir = root.join(".skills").join(scope).join(name);

    if !skills_dir.exists() {
        anyhow::bail!("Package '{}' is not installed", full_name);
    }

    // Check if other installed packages depend on this one
    let lockfile = Lockfile::load(&root)?;
    let dependants = lockfile.dependants_of(&full_name);
    if !dependants.is_empty() {
        let names: Vec<&str> = dependants.iter().map(|s| s.as_str()).collect();
        eprintln!(
            "  {} {} depends on {}",
            "⚠".yellow().bold(),
            names.join(", ").cyan(),
            full_name.cyan(),
        );
        eprint!("  Remove anyway? (y/N) ");
        io::stderr().flush()?;
        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        if !input.trim().eq_ignore_ascii_case("y") {
            println!("  Skipped.");
            return Ok(());
        }
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
