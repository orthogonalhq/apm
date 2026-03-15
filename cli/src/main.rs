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
    /// Install a skill by name
    Install {
        /// Skill name to install
        name: String,
    },
    /// Search for skills
    Search {
        /// Search query
        query: String,
    },
    /// Show details about a skill
    Info {
        /// Skill name
        name: String,
    },
    /// Validate a local SKILL.md file
    Validate {
        /// Path to SKILL.md or directory containing one
        path: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Install { name } => commands::install::run(&cli.registry, &name).await,
        Commands::Search { query } => commands::search::run(&cli.registry, &query).await,
        Commands::Info { name } => commands::info::run(&cli.registry, &name).await,
        Commands::Validate { path } => commands::validate::run(&path),
    }
}
