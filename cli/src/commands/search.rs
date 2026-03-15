use crate::types::SearchResponse;
use anyhow::Result;
use colored::Colorize;

pub async fn run(registry: &str, query: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/search?q={}", registry, urlencoding(query));
    let res = client.get(&url).send().await?;

    if !res.status().is_success() {
        anyhow::bail!("Search failed with status {}", res.status());
    }

    let data: SearchResponse = res.json().await?;

    if data.results.is_empty() {
        println!("No skills found matching '{}'", query);
        return Ok(());
    }

    println!(
        "Found {} skill(s) matching '{}':\n",
        data.total.to_string().green(),
        query
    );

    for result in &data.results {
        println!("  {} {}", result.name.cyan().bold(), format_meta(result));
        println!("  {}", result.description.dimmed());
        println!("  {}\n", result.source_repo.dimmed());
    }

    Ok(())
}

fn format_meta(result: &crate::types::SearchResult) -> String {
    let mut parts = Vec::new();
    if result.repo_stars > 0 {
        parts.push(format!("★ {}", result.repo_stars));
    }
    if let Some(ref license) = result.license {
        parts.push(license.clone());
    }
    if parts.is_empty() {
        String::new()
    } else {
        format!("({})", parts.join(" · "))
    }
}

fn urlencoding(s: &str) -> String {
    s.replace(' ', "%20")
        .replace('&', "%26")
        .replace('=', "%3D")
}
