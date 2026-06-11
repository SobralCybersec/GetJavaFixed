use std::fs;
use std::path::Path;

use serde::Serialize;

use crate::modules::fs::to_canon;
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

const GENERIC_CODE_REPO_REASON: &str = "Generic code workspace. No language-specific root manifest was detected, so analysis will use safe polyglot heuristics.";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JavaProjectType {
    Maven,
    Gradle,
    Node,
    Rust,
    Python,
    Go,
    Dotnet,
    Php,
    Ruby,
    Cpp,
    Generic,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaRepoReadiness {
    pub supported: bool,
    pub project_type: Option<JavaProjectType>,
    pub repo_name: String,
    pub reason: Option<String>,
}

pub fn inspect_repo_root(root: &Path) -> Result<JavaRepoReadiness, String> {
    if !root.is_dir() {
        return Err(format!(
            "selected root is not a directory: {}",
            root.display()
        ));
    }

    let repo_name = repo_name(root);
    if root.join("pom.xml").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Maven));
    }
    if root.join("build.gradle").is_file() || root.join("build.gradle.kts").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Gradle));
    }
    if root.join("package.json").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Node));
    }
    if root.join("Cargo.toml").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Rust));
    }
    if root.join("pyproject.toml").is_file()
        || root.join("requirements.txt").is_file()
        || root.join("setup.py").is_file()
    {
        return Ok(supported_repo(repo_name, JavaProjectType::Python));
    }
    if root.join("go.mod").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Go));
    }
    if root.join("composer.json").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Php));
    }
    if root.join("Gemfile").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Ruby));
    }
    let has_dotnet_manifest = has_direct_extension(root, &["sln", "csproj"])?;
    if has_dotnet_manifest {
        return Ok(supported_repo(repo_name, JavaProjectType::Dotnet));
    }
    if root.join("CMakeLists.txt").is_file() {
        return Ok(supported_repo(repo_name, JavaProjectType::Cpp));
    }

    Ok(JavaRepoReadiness {
        supported: true,
        project_type: Some(JavaProjectType::Generic),
        repo_name,
        reason: Some(GENERIC_CODE_REPO_REASON.to_string()),
    })
}

pub fn classify_selected_root(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<JavaRepoReadiness, String> {
    let resolved = resolve_path(path, workspace);
    let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
    inspect_repo_root(&canonical)
}

#[tauri::command]
pub async fn java_repo_readiness(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<JavaRepoReadiness, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    classify_selected_root(&path, &workspace, &registry)
}

fn repo_name(root: &Path) -> String {
    root.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| to_canon(root))
}

fn supported_repo(repo_name: String, project_type: JavaProjectType) -> JavaRepoReadiness {
    JavaRepoReadiness {
        supported: true,
        project_type: Some(project_type),
        repo_name,
        reason: None,
    }
}

fn has_direct_extension(root: &Path, extensions: &[&str]) -> Result<bool, String> {
    let entries =
        fs::read_dir(root).map_err(|e| format!("failed to scan {}: {e}", root.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("failed to read {}: {e}", root.display()))?;
        if !entry.path().is_file() {
            continue;
        }
        if entry
            .path()
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|ext| {
                extensions
                    .iter()
                    .any(|candidate| ext.eq_ignore_ascii_case(candidate))
            })
        {
            return Ok(true);
        }
    }
    Ok(false)
}
