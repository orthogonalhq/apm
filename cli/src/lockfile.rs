use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

const LOCKFILE_NAME: &str = "apm-lock.json";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lockfile {
    /// Lockfile format version
    pub lockfile_version: u32,
    /// Map of skill name -> locked entry
    pub packages: BTreeMap<String, LockedPackage>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockedPackage {
    pub source_repo: String,
    pub source_path: String,
    pub source_ref: String,
    pub commit_sha: Option<String>,
    pub integrity: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub dependencies: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
}

impl Lockfile {
    pub fn new() -> Self {
        Lockfile {
            lockfile_version: 2,
            packages: BTreeMap::new(),
        }
    }

    /// Find the lockfile by walking up from the current directory
    pub fn find_root() -> Option<PathBuf> {
        let mut dir = std::env::current_dir().ok()?;
        loop {
            let candidate = dir.join(LOCKFILE_NAME);
            if candidate.exists() {
                return Some(dir);
            }
            // Also check for common project root markers
            if dir.join("package.json").exists()
                || dir.join("Cargo.toml").exists()
                || dir.join(".git").exists()
            {
                return Some(dir);
            }
            if !dir.pop() {
                break;
            }
        }
        // Fall back to current dir
        std::env::current_dir().ok()
    }

    pub fn load(root: &Path) -> Result<Self> {
        let path = root.join(LOCKFILE_NAME);
        if !path.exists() {
            return Ok(Lockfile::new());
        }
        let content = std::fs::read_to_string(&path)?;
        let lockfile: Lockfile = serde_json::from_str(&content)?;
        Ok(lockfile)
    }

    pub fn save(&self, root: &Path) -> Result<()> {
        let path = root.join(LOCKFILE_NAME);
        let content = serde_json::to_string_pretty(self)? + "\n";
        std::fs::write(&path, content)?;
        Ok(())
    }

    pub fn remove_package(&mut self, name: &str) {
        self.packages.remove(name);
    }

    /// Returns names of installed packages that list `name` as a dependency
    pub fn dependants_of(&self, name: &str) -> Vec<String> {
        self.packages
            .iter()
            .filter(|(_, pkg)| pkg.dependencies.iter().any(|d| d == name))
            .map(|(k, _)| k.clone())
            .collect()
    }

    pub fn add_package(
        &mut self,
        name: &str,
        source_repo: &str,
        source_path: &str,
        source_ref: &str,
        commit_sha: Option<&str>,
        integrity: Option<&str>,
        description: Option<&str>,
        kind: Option<&str>,
        dependencies: Vec<String>,
        tags: Vec<String>,
    ) {
        self.packages.insert(
            name.to_string(),
            LockedPackage {
                source_repo: source_repo.to_string(),
                source_path: source_path.to_string(),
                source_ref: source_ref.to_string(),
                commit_sha: commit_sha.map(String::from),
                integrity: integrity.map(String::from),
                description: description.map(String::from),
                kind: kind.map(String::from),
                dependencies,
                tags,
            },
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_lockfile_is_empty() {
        let lf = Lockfile::new();
        assert_eq!(lf.lockfile_version, 2);
        assert!(lf.packages.is_empty());
    }

    #[test]
    fn add_and_remove_package() {
        let mut lf = Lockfile::new();
        lf.add_package(
            "@apm/test",
            "orthogonalhq/apm-skills",
            "test",
            "main",
            Some("abc123"),
            Some("sha256-deadbeef"),
            Some("A test skill"),
            Some("skill"),
            vec![],
            vec!["test".to_string()],
        );
        assert!(lf.packages.contains_key("@apm/test"));
        assert_eq!(lf.packages["@apm/test"].commit_sha.as_deref(), Some("abc123"));
        assert_eq!(lf.packages["@apm/test"].integrity.as_deref(), Some("sha256-deadbeef"));

        lf.remove_package("@apm/test");
        assert!(!lf.packages.contains_key("@apm/test"));
    }

    #[test]
    fn serialization_roundtrip() {
        let mut lf = Lockfile::new();
        lf.add_package(
            "@apm/init",
            "orthogonalhq/apm-skills",
            "init",
            "main",
            Some("abc123"),
            Some("sha256-test"),
            Some("APM init"),
            Some("composite"),
            vec!["@apm/search".to_string()],
            vec![],
        );

        let json = serde_json::to_string_pretty(&lf).unwrap();
        let parsed: Lockfile = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.lockfile_version, 2);
        assert_eq!(parsed.packages.len(), 1);
        let pkg = &parsed.packages["@apm/init"];
        assert_eq!(pkg.source_repo, "orthogonalhq/apm-skills");
        assert_eq!(pkg.commit_sha.as_deref(), Some("abc123"));
        assert_eq!(pkg.integrity.as_deref(), Some("sha256-test"));
        assert_eq!(pkg.kind.as_deref(), Some("composite"));
        assert_eq!(pkg.dependencies, vec!["@apm/search"]);
    }

    #[test]
    fn empty_optional_fields_omitted() {
        let mut lf = Lockfile::new();
        lf.add_package(
            "@scope/name",
            "owner/repo",
            "path",
            "main",
            None,
            None,
            None,
            None,
            vec![],
            vec![],
        );

        let json = serde_json::to_string(&lf).unwrap();
        assert!(!json.contains("description"));
        assert!(!json.contains("\"kind\""));
        assert!(!json.contains("dependencies"));
        assert!(!json.contains("tags"));
    }
}
