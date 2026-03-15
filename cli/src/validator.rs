use crate::types::SkillFrontmatter;
use anyhow::Result;
use std::path::Path;

pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub frontmatter: Option<SkillFrontmatter>,
}

pub fn validate_skill_md(content: &str, parent_dir: Option<&str>) -> ValidationResult {
    let mut errors = Vec::new();

    // Split frontmatter
    let frontmatter_str = match extract_frontmatter(content) {
        Some(fm) => fm,
        None => {
            return ValidationResult {
                valid: false,
                errors: vec!["No YAML frontmatter found (must start with ---)".to_string()],
                frontmatter: None,
            };
        }
    };

    // Parse YAML
    let fm: SkillFrontmatter = match serde_yaml::from_str(&frontmatter_str) {
        Ok(fm) => fm,
        Err(e) => {
            return ValidationResult {
                valid: false,
                errors: vec![format!("Failed to parse YAML frontmatter: {}", e)],
                frontmatter: None,
            };
        }
    };

    // Validate name
    if fm.name.is_empty() {
        errors.push("name must not be empty".to_string());
    } else {
        if fm.name.len() > 64 {
            errors.push("name must be at most 64 characters".to_string());
        }
        let name_re = regex_lite::Regex::new(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$").unwrap();
        if !name_re.is_match(&fm.name) {
            errors.push(
                "name must be lowercase alphanumeric with hyphens, no leading/trailing/consecutive hyphens"
                    .to_string(),
            );
        }
        if fm.name.contains("--") {
            errors.push("name must not contain consecutive hyphens".to_string());
        }
        if let Some(dir) = parent_dir {
            if fm.name != dir {
                errors.push(format!(
                    "name \"{}\" does not match parent directory \"{}\"",
                    fm.name, dir
                ));
            }
        }
    }

    // Validate description
    if fm.description.is_empty() {
        errors.push("description must not be empty".to_string());
    } else if fm.description.len() > 1024 {
        errors.push("description must be at most 1024 characters".to_string());
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
        frontmatter: Some(fm),
    }
}

fn extract_frontmatter(content: &str) -> Option<String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }
    let after_first = &trimmed[3..];
    if let Some(end) = after_first.find("\n---") {
        Some(after_first[..end].to_string())
    } else {
        None
    }
}

pub fn validate_file(path: &Path) -> Result<ValidationResult> {
    let skill_path = if path.is_dir() {
        path.join("SKILL.md")
    } else {
        path.to_path_buf()
    };

    if !skill_path.exists() {
        anyhow::bail!("SKILL.md not found at {}", skill_path.display());
    }

    let content = std::fs::read_to_string(&skill_path)?;

    let parent_dir = skill_path
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str());

    Ok(validate_skill_md(&content, parent_dir))
}
