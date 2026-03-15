mod commands;
mod lockfile;
mod types;
mod validator;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "apm", version, about = "Agent Package Manager — a package manager for agent skills")]
struct Cli {
    /// APM registry URL
    #[arg(long, env = "APM_REGISTRY", default_value = "https://apm.sh")]
    registry: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Install a skill by scoped name (e.g. @anthropics/code-review)
    Install {
        /// Scoped package name (@scope/name)
        package: String,
    },
    /// Search for skills
    Search {
        /// Search query
        query: String,
    },
    /// Show details about a skill
    Info {
        /// Scoped package name (@scope/name)
        package: String,
    },
    /// Validate a local SKILL.md file
    Validate {
        /// Path to SKILL.md or directory containing one
        path: String,
    },
}

/// Parse "@scope/name" into (scope, name). Exits with error if invalid.
fn parse_scoped_name(input: &str) -> anyhow::Result<(String, String)> {
    let input = input.strip_prefix('@').unwrap_or(input);
    let parts: Vec<&str> = input.splitn(2, '/').collect();
    if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
        anyhow::bail!(
            "Invalid package name '{}'. Use @scope/name format (e.g. @anthropics/code-review)",
            input
        );
    }
    Ok((parts[0].to_string(), parts[1].to_string()))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Install { package } => {
            let (scope, name) = parse_scoped_name(&package)?;
            commands::install::run(&cli.registry, &scope, &name).await
        }
        Commands::Search { query } => commands::search::run(&cli.registry, &query).await,
        Commands::Info { package } => {
            let (scope, name) = parse_scoped_name(&package)?;
            commands::info::run(&cli.registry, &scope, &name).await
        }
        Commands::Validate { path } => commands::validate::run(&path),
    }
}
