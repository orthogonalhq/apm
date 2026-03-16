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

pub fn run() -> Result<()> {
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

    // Step 2: Skill references
    let lockfile = Lockfile::load(&root)?;
    let skill_names: Vec<&String> = lockfile.packages.keys().collect();

    if !skill_names.is_empty() && agents_path.exists() {
        println!(
            "  You have {} installed skill(s):",
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
                // Truncate long descriptions
                let short = if desc.len() > 70 {
                    format!("{}...", &desc[..67])
                } else {
                    desc.to_string()
                };
                println!("    {} — {}", name.cyan(), short);
            }
        }
        println!();

        let existing_content = fs::read_to_string(&agents_path).unwrap_or_default();
        let has_skill_refs = skill_names
            .iter()
            .any(|n| {
                let stripped = n.strip_prefix('@').unwrap_or(n);
                existing_content.contains(&format!("@skill:{}", stripped))
            });

        if has_skill_refs {
            println!(
                "  {} Skill references already present in AGENTS.md\n",
                "✓".green()
            );
        } else if confirm(
            "Add skill references to AGENTS.md?",
            "@skill:scope/name tells agents which installed skills to load.\n  Agents read these references and load the corresponding SKILL.md files.",
        )? {
            inject_skill_refs(&agents_path, &skill_names)?;
            println!(
                "  {} Added @skill references to {}\n",
                "✓".green(),
                "AGENTS.md".cyan()
            );
        } else {
            println!();
        }
    } else if skill_names.is_empty() {
        println!(
            "  {} No skills installed yet. Run {} to get started.\n",
            "·".dimmed(),
            "apm search <query>".cyan()
        );
    }

    // Step 3: Detect agent configs and offer to wire them up
    for (filename, agent_name) in AGENT_CONFIGS {
        let config_path = root.join(filename);
        if !config_path.exists() || !agents_path.exists() {
            continue;
        }

        let content = fs::read_to_string(&config_path).unwrap_or_default();
        if content.contains("AGENTS.md") {
            println!(
                "  {} {} already references AGENTS.md\n",
                "✓".green(),
                agent_name.cyan()
            );
            continue;
        }

        if confirm(
            &format!("Detected {} — add a reference to AGENTS.md in {}?", filename, filename),
            &format!(
                "This tells {} to read AGENTS.md, which links to your installed skills.",
                agent_name
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
        "https://apm.orthg.nl/docs/skill-references".dimmed()
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

fn inject_skill_refs(agents_path: &Path, skill_names: &[&String]) -> Result<()> {
    let mut content = fs::read_to_string(agents_path)?;

    if !content.ends_with('\n') {
        content.push('\n');
    }

    content.push_str(&format!("\n{}\n", APM_BLOCK_START));
    content.push_str("## Installed Skills\n\n");

    for name in skill_names {
        let stripped = name.strip_prefix('@').unwrap_or(name);
        content.push_str(&format!("@skill:{}\n", stripped));
    }

    content.push_str(&format!("\n{}\n", APM_BLOCK_END));

    fs::write(agents_path, content)?;
    Ok(())
}

fn inject_agents_ref(config_path: &Path, _filename: &str) -> Result<()> {
    let mut content = fs::read_to_string(config_path)?;

    if !content.ends_with('\n') {
        content.push('\n');
    }

    content.push_str("\nSee [AGENTS.md](./AGENTS.md) for installed agent skills.\n");

    fs::write(config_path, content)?;
    Ok(())
}
