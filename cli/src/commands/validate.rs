use crate::validator;
use anyhow::Result;
use colored::Colorize;
use std::path::Path;

pub fn run(path: &str) -> Result<()> {
    let path = Path::new(path);
    let result = validator::validate_file(path)?;

    if result.valid {
        let fm = result.frontmatter.unwrap();
        println!("{} SKILL.md is valid", "✓".green().bold());
        println!("  name: {}", fm.name.cyan());
        println!("  description: {}", fm.description);
    } else {
        println!("{} SKILL.md has {} error(s):", "✗".red().bold(), result.errors.len());
        for error in &result.errors {
            println!("  {} {}", "·".red(), error);
        }
        std::process::exit(1);
    }

    Ok(())
}
