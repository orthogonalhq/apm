use crate::types::PackageResponse;
use anyhow::Result;
use colored::Colorize;

pub async fn run(registry: &str, scope: &str, name: &str) -> Result<()> {
    let full_name = format!("@{}/{}", scope, name);

    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/@{}/{}", registry, scope, name);
    let res = client.get(&url).send().await?;

    if res.status() == 404 {
        anyhow::bail!("Package '{}' not found", full_name);
    }

    if !res.status().is_success() {
        anyhow::bail!("Registry returned status {}", res.status());
    }

    let pkg: PackageResponse = res.json().await?;

    println!();
    println!("  {} {}", full_name.cyan().bold(), pkg.description);
    println!();
    println!("  {} @{}", "scope:".dimmed(), pkg.scope);
    println!("  {}  {}", "repo:".dimmed(), pkg.source_repo);
    println!("  {}  {}", "path:".dimmed(), pkg.source_path);
    println!("  {}   {}", "ref:".dimmed(), pkg.source_ref);
    println!("  {} {}", "owner:".dimmed(), pkg.repo_owner);
    println!("  {} {}", "stars:".dimmed(), pkg.repo_stars);
    if let Some(ref license) = pkg.license {
        println!("  {} {}", "license:".dimmed(), license);
    }
    println!();
    println!("  {}", "Install:".bold());
    println!("  apm install {}", full_name);
    println!();

    Ok(())
}
