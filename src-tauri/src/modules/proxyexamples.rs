use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::modules::fs::to_canon;
use crate::modules::net::{ai_http_request, HttpResponse};
use crate::modules::shell::{spawn_background_registered, ShellState};
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

const DEFAULT_PROXY_BASE_URL: &str = "http://127.0.0.1:3000/v1";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ProxyKind {
    DeepsProxy,
    KimiProxy,
}

impl ProxyKind {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "deepsproxy" => Ok(Self::DeepsProxy),
            "kimiproxy" => Ok(Self::KimiProxy),
            _ => Err(format!("unknown proxyexample: {value}")),
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::DeepsProxy => "deepsproxy",
            Self::KimiProxy => "kimiproxy",
        }
    }

    fn display_name(self) -> &'static str {
        match self {
            Self::DeepsProxy => "DeepsProxy",
            Self::KimiProxy => "KimiProxy",
        }
    }

    fn default_base_url(self) -> &'static str {
        DEFAULT_PROXY_BASE_URL
    }
}

#[derive(Debug, Default, Deserialize)]
struct PackageJson {
    #[serde(default)]
    scripts: HashMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyExampleInfo {
    pub id: String,
    pub display_name: String,
    pub path: Option<String>,
    pub detected: bool,
    pub has_start_script: bool,
    pub has_login_script: bool,
    pub default_base_url: String,
    pub login_variants: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyExampleHealth {
    pub ok: bool,
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyExampleModel {
    pub id: String,
    pub object: Option<String>,
    pub owned_by: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProxyModelsResponse {
    data: Vec<ProxyExampleModel>,
}

fn normalize_openai_compat_root(base_url: &str) -> String {
    base_url.trim().trim_end_matches('/').to_string()
}

fn normalize_health_url(base_url: &str) -> String {
    let root = normalize_openai_compat_root(base_url);
    let root = root.strip_suffix("/v1").unwrap_or(&root);
    format!("{root}/health")
}

fn normalize_models_url(base_url: &str) -> String {
    let root = normalize_openai_compat_root(base_url);
    let root = root.strip_suffix("/v1").unwrap_or(&root);
    format!("{root}/v1/models")
}

fn resolve_proxy_dir(
    configured_path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<PathBuf, String> {
    let trimmed = configured_path.trim();
    if trimmed.is_empty() {
        return Err("no proxy folder configured".to_string());
    }
    let root = resolve_path(trimmed, workspace);
    let canonical = std::fs::canonicalize(&root)
        .map_err(|e| format!("configured proxy folder not found: {e}"))?;
    if !canonical.is_dir() {
        return Err("configured proxy path is not a directory".to_string());
    }
    registry.authorize(&canonical).map_err(|e| e.to_string())?;
    Ok(canonical)
}

fn read_package_json(dir: &Path) -> Option<PackageJson> {
    let path = dir.join("package.json");
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<PackageJson>(&content).ok()
}

fn package_scripts_info(kind: ProxyKind, dir: Option<&Path>) -> ProxyExampleInfo {
    let pkg = dir.and_then(read_package_json);
    let scripts = pkg.as_ref().map(|p| &p.scripts);
    let login_variants = scripts
        .map(|m| {
            let mut names = m
                .keys()
                .filter(|name| name.starts_with("login"))
                .cloned()
                .collect::<Vec<_>>();
            names.sort();
            names
        })
        .unwrap_or_default();
    ProxyExampleInfo {
        id: kind.id().to_string(),
        display_name: kind.display_name().to_string(),
        path: dir.map(to_canon),
        detected: dir.is_some(),
        has_start_script: scripts.is_some_and(|m| m.contains_key("start")),
        has_login_script: scripts.is_some_and(|m| m.contains_key("login")),
        default_base_url: kind.default_base_url().to_string(),
        login_variants,
    }
}

#[tauri::command]
pub async fn proxyexample_detect(
    proxy_id: String,
    path: Option<String>,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<ProxyExampleInfo, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let kind = ProxyKind::parse(&proxy_id)?;
    let dir = path
        .as_deref()
        .and_then(|value| resolve_proxy_dir(value, &workspace, &registry).ok());
    Ok(package_scripts_info(kind, dir.as_deref()))
}

#[tauri::command]
pub fn proxyexample_start(
    proxy_id: String,
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
    shell_state: tauri::State<'_, ShellState>,
) -> Result<u32, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let kind = ProxyKind::parse(&proxy_id)?;
    let dir = resolve_proxy_dir(&path, &workspace, &registry)?;
    let info = package_scripts_info(kind, Some(&dir));
    if !info.has_start_script {
        return Err(format!(
            "{} does not define an npm start script",
            info.display_name
        ));
    }
    spawn_background_registered(
        &shell_state,
        "npm run start".to_string(),
        Some(to_canon(&dir)),
        workspace,
    )
}

#[tauri::command]
pub fn proxyexample_login(
    proxy_id: String,
    path: String,
    script: Option<String>,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
    shell_state: tauri::State<'_, ShellState>,
) -> Result<u32, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let kind = ProxyKind::parse(&proxy_id)?;
    let dir = resolve_proxy_dir(&path, &workspace, &registry)?;
    let info = package_scripts_info(kind, Some(&dir));
    if !info.has_login_script {
        return Err(format!(
            "{} does not define an npm login script",
            info.display_name
        ));
    }
    let chosen = script
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "login".to_string());
    if !info.login_variants.iter().any(|value| value == &chosen) {
        return Err(format!(
            "{} does not define npm script '{chosen}'",
            info.display_name
        ));
    }
    spawn_background_registered(
        &shell_state,
        format!("npm run {chosen}"),
        Some(to_canon(&dir)),
        workspace,
    )
}

async fn request_proxy_url(url: String, api_key: Option<String>) -> Result<HttpResponse, String> {
    let headers = api_key
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            let trimmed = value.trim().to_string();
            let mut out = HashMap::new();
            out.insert("Authorization".to_string(), format!("Bearer {trimmed}"));
            out.insert("X-API-Key".to_string(), trimmed);
            out
        });
    ai_http_request(url, "GET".to_string(), headers, None, Some(true)).await
}

#[tauri::command]
pub async fn proxyexample_health(base_url: String) -> Result<ProxyExampleHealth, String> {
    let response = request_proxy_url(normalize_health_url(&base_url), None).await?;
    Ok(ProxyExampleHealth {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        body: String::from_utf8_lossy(&response.body).into_owned(),
    })
}

#[tauri::command]
pub async fn proxyexample_models(
    base_url: String,
    api_key: Option<String>,
) -> Result<Vec<ProxyExampleModel>, String> {
    let response = request_proxy_url(normalize_models_url(&base_url), api_key).await?;
    if response.status < 200 || response.status >= 300 {
        return Err(format!(
            "models request failed with status {}",
            response.status
        ));
    }
    let parsed: ProxyModelsResponse = serde_json::from_slice(&response.body)
        .map_err(|e| format!("invalid models response: {e}"))?;
    Ok(parsed.data)
}
