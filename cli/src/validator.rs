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
        if !name_re.is_match(&fm.name) || fm.name.contains("--") {
            errors.push(
                "name must be lowercase alphanumeric with hyphens (no leading, trailing, or consecutive hyphens)"
                    .to_string(),
            );
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

    // Validate kind
    let kind = fm.extra.get("kind").and_then(|v| v.as_str().map(String::from));
    if let Some(ref k) = kind {
        if k != "skill" && k != "composite" {
            errors.push(format!(
                "kind must be \"skill\" or \"composite\", got \"{}\"",
                k
            ));
        }
    }

    // Validate dependencies
    let deps = fm
        .extra
        .get("dependencies")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let is_composite = kind.as_deref() == Some("composite");

    if is_composite && deps.is_empty() {
        errors.push("composite skills must declare at least one dependency".to_string());
    }

    if !deps.is_empty() && !is_composite {
        errors.push(
            "dependencies declared but kind is not \"composite\" — add kind: composite to frontmatter"
                .to_string(),
        );
    }

    // Validate dependency format
    for dep in &deps {
        let stripped = dep.strip_prefix('@').unwrap_or(dep);
        let parts: Vec<&str> = stripped.splitn(2, '/').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
            errors.push(format!(
                "invalid dependency format: \"{}\" — expected @scope/name",
                dep
            ));
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_minimal_skill() {
        let content = "---\nname: my-skill\ndescription: A test skill\n---\nBody here.";
        let result = validate_skill_md(content, Some("my-skill"));
        assert!(result.valid, "errors: {:?}", result.errors);
    }

    #[test]
    fn missing_frontmatter() {
        let content = "No frontmatter here";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors[0].contains("No YAML frontmatter"));
    }

    #[test]
    fn empty_name() {
        let content = "---\nname: \"\"\ndescription: A test\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("name must not be empty")));
    }

    #[test]
    fn uppercase_name() {
        let content = "---\nname: My-Skill\ndescription: A test\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("lowercase")));
    }

    #[test]
    fn consecutive_hyphens_single_error() {
        let content = "---\nname: my--skill\ndescription: A test\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        // Should produce exactly ONE name error, not two
        let name_errors: Vec<_> = result.errors.iter().filter(|e| e.contains("name")).collect();
        assert_eq!(name_errors.len(), 1, "expected 1 name error, got: {:?}", name_errors);
    }

    #[test]
    fn name_too_long() {
        let long_name = "a".repeat(65);
        let content = format!("---\nname: {}\ndescription: A test\n---\n", long_name);
        let result = validate_skill_md(&content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("64 characters")));
    }

    #[test]
    fn name_directory_mismatch() {
        let content = "---\nname: foo\ndescription: A test\n---\n";
        let result = validate_skill_md(content, Some("bar"));
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("does not match")));
    }

    #[test]
    fn empty_description() {
        let content = "---\nname: my-skill\ndescription: \"\"\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("description")));
    }

    #[test]
    fn description_too_long() {
        let long_desc = "a".repeat(1025);
        let content = format!("---\nname: my-skill\ndescription: {}\n---\n", long_desc);
        let result = validate_skill_md(&content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("1024")));
    }

    #[test]
    fn valid_composite_skill() {
        let content = "---\nname: my-comp\ndescription: A composite\nkind: composite\ndependencies:\n  - \"@scope/dep1\"\n  - \"@scope/dep2\"\n---\n";
        let result = validate_skill_md(content, Some("my-comp"));
        assert!(result.valid, "errors: {:?}", result.errors);
    }

    #[test]
    fn invalid_kind() {
        let content = "---\nname: my-skill\ndescription: A test\nkind: workflow\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("kind must be")));
    }

    #[test]
    fn composite_without_deps() {
        let content = "---\nname: my-comp\ndescription: A test\nkind: composite\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("must declare at least one dependency")));
    }

    #[test]
    fn deps_without_composite_kind() {
        let content = "---\nname: my-skill\ndescription: A test\ndependencies:\n  - \"@scope/dep\"\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("kind is not")));
    }

    #[test]
    fn invalid_dep_format() {
        let content = "---\nname: my-comp\ndescription: A test\nkind: composite\ndependencies:\n  - \"bad-format\"\n---\n";
        let result = validate_skill_md(content, None);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("invalid dependency format")));
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
