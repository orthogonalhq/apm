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
}

impl Lockfile {
    pub fn new() -> Self {
        Lockfile {
            lockfile_version: 1,
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
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&path, content)?;
        Ok(())
    }

    pub fn add_package(
        &mut self,
        name: &str,
        source_repo: &str,
        source_path: &str,
        source_ref: &str,
        commit_sha: Option<&str>,
    ) {
        self.packages.insert(
            name.to_string(),
            LockedPackage {
                source_repo: source_repo.to_string(),
                source_path: source_path.to_string(),
                source_ref: source_ref.to_string(),
                commit_sha: commit_sha.map(String::from),
                integrity: None,
            },
        );
    }
}
