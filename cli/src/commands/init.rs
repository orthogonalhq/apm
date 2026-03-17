use crate::commands::install;
use crate::lockfile::Lockfile;
use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;
use std::io::{self, BufRead, Write};
use std::path::Path;

const AGENTS_MD: &str = "AGENTS.md";
const APM_BLOCK_START: &str = "<!-- apm:skills -->";
const APM_BLOCK_END: &str = "<!-- /apm:skills -->";

/// Known agent config files to detect
const AGENT_CONFIGS: &[(&str, &str)] = &[
    ("CLAUDE.md", "Claude Code"),
    (".cursorrules", "Cursor"),
    (".github/copilot-instructions.md", "GitHub Copilot"),
    ("GEMINI.md", "Gemini CLI"),
    (".windsurfrules", "Windsurf"),
];

pub async fn run(registry: &str) -> Result<()> {
    let root = Lockfile::find_root().context("Could not determine project root")?;

    println!(
        "\n{} Setting up APM for this project.\n",
        "apm".green().bold()
    );

    // Step 1: AGENTS.md
    let agents_path = root.join(AGENTS_MD);
    let agents_existed = agents_path.exists();

    if !agents_existed {
        if confirm(
            "Create AGENTS.md?",
            "AGENTS.md is the entry point for AI agents working in your project.\n  It contains project-specific instructions and references to skills.",
        )? {
            let content = "# Agent Configuration\n\n\
                <!-- Add project-specific instructions for AI agents here -->\n";
            fs::write(&agents_path, content)?;
            println!(
                "  {} Created {}\n",
                "✓".green(),
                "AGENTS.md".cyan()
            );
        } else {
            println!();
        }
    } else {
        println!(
            "  {} {} already exists\n",
            "✓".green(),
            "AGENTS.md".cyan()
        );
    }

    // Step 2: Install @apm/init if not already installed
    let apm_init_path = root.join(".skills").join("apm").join("init").join("SKILL.md");
    if !apm_init_path.exists() {
        println!(
            "  {} Installing @apm/init skill...",
            "↓".cyan()
        );
        if let Err(e) = install::run_one(registry, "apm", "init").await {
            eprintln!(
                "  {} Could not install @apm/init: {}\n  Skills will still work if you install it manually later.",
                "⚠".yellow(),
                e
            );
        }
    } else {
        println!(
            "  {} @apm/init already installed\n",
            "✓".green()
        );
    }

    // Step 3: Skill discovery instructions
    if agents_path.exists() {
        let existing_content = fs::read_to_string(&agents_path).unwrap_or_default();
        let has_apm_block = existing_content.contains(APM_BLOCK_START);

        if has_apm_block {
            println!(
                "  {} Skill resolution block already present in AGENTS.md\n",
                "✓".green()
            );
        } else if confirm(
            "Teach agents how to use installed skills?",
            "Adds the @skill: resolution syntax and a link to the APM spec to AGENTS.md.\n  Without this, agents can't find or load skills installed by APM.",
        )? {
            inject_skill_discovery(&agents_path)?;
            println!(
                "  {} Added skill resolution block to {}\n",
                "✓".green(),
                "AGENTS.md".cyan()
            );
        } else {
            println!();
        }

        // Show installed skills summary
        let lockfile = Lockfile::load(&root)?;
        let skill_names: Vec<&String> = lockfile.packages.keys().collect();

        if !skill_names.is_empty() {
            println!(
                "  {} installed skill(s) in apm-lock.json:",
                skill_names.len().to_string().cyan()
            );
            for name in &skill_names {
                let desc = lockfile
                    .packages
                    .get(*name)
                    .and_then(|p| p.description.as_deref())
                    .unwrap_or("");
                if desc.is_empty() {
                    println!("    {}", name.cyan());
                } else {
                    let short = if desc.len() > 70 {
                        format!("{}...", &desc[..67])
                    } else {
                        desc.to_string()
                    };
                    println!("    {} — {}", name.cyan(), short);
                }
            }
            println!();
        } else {
            println!(
                "  {} No skills installed yet. Run {} to get started.\n",
                "·".dimmed(),
                "apm search <query>".cyan()
            );
        }
    }

    // Step 3: Detect agent configs and offer to wire them up
    for (filename, agent_name) in AGENT_CONFIGS {
        let config_path = root.join(filename);
        if !config_path.exists() || !agents_path.exists() {
            continue;
        }

        let content = fs::read_to_string(&config_path).unwrap_or_default();
        if content.contains(APM_BLOCK_START) || content.contains("AGENTS.md") {
            println!(
                "  {} {} already references AGENTS.md\n",
                "✓".green(),
                agent_name.cyan()
            );
            continue;
        }

        if confirm(
            &format!("Wire {} → AGENTS.md?", filename),
            &format!(
                "{} reads {} but not AGENTS.md directly.\n  This reference completes the chain: {} → AGENTS.md → skills.",
                agent_name, filename, filename
            ),
        )? {
            inject_agents_ref(&config_path, filename)?;
            println!(
                "  {} Updated {}\n",
                "✓".green(),
                filename.cyan()
            );
        } else {
            println!();
        }
    }

    // Done
    println!(
        "{} Done! Your agents can now discover installed skills.",
        "apm".green().bold()
    );
    println!(
        "  Learn more: {}\n",
        "https://apm.orthg.nl/docs/at-skill-spec".dimmed()
    );

    Ok(())
}

fn confirm(question: &str, explanation: &str) -> Result<bool> {
    print!("  {} {} (Y/n) ", "?".yellow().bold(), question);
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().lock().read_line(&mut input)?;
    let answer = input.trim().to_lowercase();

    if answer.is_empty() || answer == "y" || answer == "yes" {
        // Print explanation after confirming
        for line in explanation.lines() {
            println!("  {}", line.dimmed());
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

fn inject_skill_discovery(agents_path: &Path) -> Result<()> {
    let mut content = fs::read_to_string(agents_path)?;

    if !content.ends_with('\n') {
        content.push('\n');
    }

    content.push_str(&format!(
        "\n{}\n\
        ## Installed Skills\n\
        \n\
        See .skills/apm/init/SKILL.md for the APM skill specification.\n\
        \n{}\n",
        APM_BLOCK_START, APM_BLOCK_END
    ));

    fs::write(agents_path, content)?;
    Ok(())
}

fn inject_agents_ref(config_path: &Path, _filename: &str) -> Result<()> {
    let mut content = fs::read_to_string(config_path)?;

    if !content.ends_with('\n') {
        content.push('\n');
    }

    content.push_str(&format!(
        "\n{}\n\
        See [AGENTS.md](./AGENTS.md) for installed agent skills.\n\
        {}\n",
        APM_BLOCK_START, APM_BLOCK_END
    ));

    fs::write(config_path, content)?;
    Ok(())
}
