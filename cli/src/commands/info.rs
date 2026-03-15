use crate::types::PackageResponse;
use anyhow::Result;
use colored::Colorize;

pub async fn run(registry: &str, name: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/packages/{}", registry, name);
    let res = client.get(&url).send().await?;

    if res.status() == 404 {
        anyhow::bail!("Package '{}' not found", name);
    }

    if !res.status().is_success() {
        anyhow::bail!("Registry returned status {}", res.status());
    }

    let pkg: PackageResponse = res.json().await?;

    println!();
    println!("  {} {}", pkg.name.cyan().bold(), pkg.description);
    println!();
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
    println!("  apm install {}", pkg.name);
    println!();

    Ok(())
}
