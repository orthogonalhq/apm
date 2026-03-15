use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct Package {
    pub scope: String,
    pub name: String,
    pub description: String,
    pub source_repo: Option<String>,
    pub source_path: Option<String>,
    pub source_ref: Option<String>,
    pub repo_owner: Option<String>,
    pub repo_stars: Option<i64>,
    pub license: Option<String>,
    pub skill_md_raw: Option<String>,
    pub frontmatter: Option<serde_json::Value>,
    pub last_indexed_at: Option<String>,
}

// API uses camelCase
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageResponse {
    pub scope: String,
    pub name: String,
    pub description: String,
    pub source_repo: String,
    pub source_path: String,
    pub source_ref: String,
    pub repo_owner: String,
    pub repo_stars: i64,
    pub license: Option<String>,
    pub skill_md_raw: String,
    pub last_indexed_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub scope: String,
    pub name: String,
    pub description: String,
    pub source_repo: String,
    pub repo_owner: String,
    pub repo_stars: i64,
    pub license: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillFrontmatter {
    pub name: String,
    pub description: String,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}
