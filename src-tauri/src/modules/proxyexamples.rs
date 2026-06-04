use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use crate::modules::fs::to_canon;
use crate::modules::net::{ai_http_request, HttpResponse};
use crate::modules::shell::{spawn_background_registered, ShellState};
use crate::modules::workspace::{
    launch_cwd_snapshot, resolve_path, WorkspaceEnv, WorkspaceRegistry,
};

static PROXY_PRESET_MANIFEST: &str = include_str!("proxyexamples.manifest.json");
static PROXY_PRESETS: OnceLock<Result<Vec<ProxyPreset>, String>> = OnceLock::new();

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProxyPreset {
    id: String,
    display_name: String,
    default_base_url: String,
    start_script: String,
    login_script_prefix: String,
}

#[derive(Debug, Deserialize)]
struct ProxyPresetManifest {
    presets: Vec<ProxyPreset>,
}

struct ProxyPresetBuilder {
    id: String,
    display_name: Option<String>,
    default_base_url: Option<String>,
    start_script: Option<String>,
    login_script_prefix: Option<String>,
}

impl ProxyPresetBuilder {
    fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            display_name: None,
            default_base_url: None,
            start_script: None,
            login_script_prefix: None,
        }
    }

    fn display_name(mut self, value: &str) -> Self {
        self.display_name = Some(value.to_string());
        self
    }

    fn default_base_url(mut self, value: &str) -> Self {
        self.default_base_url = Some(value.to_string());
        self
    }

    fn start_script(mut self, value: &str) -> Self {
        self.start_script = Some(value.to_string());
        self
    }

    fn login_script_prefix(mut self, value: &str) -> Self {
        self.login_script_prefix = Some(value.to_string());
        self
    }

    fn build(self) -> Result<ProxyPreset, String> {
        Ok(ProxyPreset {
            id: self.id,
            display_name: self
                .display_name
                .ok_or_else(|| "proxy preset missing display name".to_string())?,
            default_base_url: self
                .default_base_url
                .ok_or_else(|| "proxy preset missing default base URL".to_string())?,
            start_script: self
                .start_script
                .ok_or_else(|| "proxy preset missing start script".to_string())?,
            login_script_prefix: self
                .login_script_prefix
                .ok_or_else(|| "proxy preset missing login script prefix".to_string())?,
        })
    }
}

fn load_proxy_presets() -> Result<&'static Vec<ProxyPreset>, String> {
    let result = PROXY_PRESETS.get_or_init(|| {
        let manifest: ProxyPresetManifest = serde_json::from_str(PROXY_PRESET_MANIFEST)
            .map_err(|e| format!("invalid proxy preset manifest: {e}"))?;
        manifest
            .presets
            .into_iter()
            .map(|preset| {
                ProxyPresetBuilder::new(&preset.id)
                    .display_name(&preset.display_name)
                    .default_base_url(&preset.default_base_url)
                    .start_script(&preset.start_script)
                    .login_script_prefix(&preset.login_script_prefix)
                    .build()
            })
            .collect::<Result<Vec<_>, _>>()
    });
    match result {
        Ok(presets) => Ok(presets),
        Err(error) => Err(error.clone()),
    }
}

fn get_proxy_preset(id: &str) -> Result<ProxyPreset, String> {
    load_proxy_presets()?
        .iter()
        .find(|preset| preset.id == id)
        .cloned()
        .ok_or_else(|| format!("unknown proxyexample: {id}"))
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyExampleStatus {
    pub proxy_id: String,
    pub display_name: String,
    pub configured_path_ok: bool,
    pub has_start_script: bool,
    pub has_login_script: bool,
    pub health_ok: bool,
    pub health_status: Option<u16>,
    pub models_reachable: bool,
    pub recovery_hint: Option<String>,
    pub path_error: Option<String>,
    pub health_error: Option<String>,
    pub models_error: Option<String>,
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

fn infer_recovery_hint(
    path_ok: bool,
    has_login_script: bool,
    health: Option<&ProxyExampleHealth>,
    health_error: Option<&str>,
    models_error: Option<&str>,
) -> Option<String> {
    if !path_ok {
        return Some(
            "Choose the proxy preset folder so JavaRf can start it or launch its login flow."
                .to_string(),
        );
    }

    let combined = [
        health.map(|value| value.body.as_str()),
        health_error,
        models_error,
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" ")
    .to_lowercase();

    if combined.contains("login required") {
        return Some(if has_login_script {
            "The proxy needs an interactive login. Run the preset login flow, finish the browser session, then retry.".to_string()
        } else {
            "The proxy reports that upstream login is required before models can load.".to_string()
        });
    }
    if combined.contains("waf challenge") || combined.contains("challenge") {
        return Some(if has_login_script {
            "The upstream site is presenting a challenge. Run the preset login flow and let the browser finish it before retrying.".to_string()
        } else {
            "The upstream site is presenting a challenge before model discovery can succeed.".to_string()
        });
    }
    if combined.contains("net::err_aborted")
        || combined.contains("failed to open deepseek start page")
        || combined.contains("deepseek_navigation_failed")
    {
        return Some(if has_login_script {
            "The proxy is up, but its browser-backed upstream session is stale. Run login to refresh it, then retry.".to_string()
        } else {
            "The proxy is up, but its upstream browser session is not ready yet.".to_string()
        });
    }
    if let Some(error) = health_error {
        let lower = error.to_lowercase();
        if lower.contains("connection")
            || lower.contains("refused")
            || lower.contains("timed out")
            || lower.contains("dns")
        {
            return Some(
                "The proxy does not look started yet. Start the preset, wait for /health, then retry model loading."
                    .to_string(),
            );
        }
    }
    if let Some(health) = health {
        if !health.ok {
            return Some(format!(
                "The proxy responded to /health with status {}. Re-check the preset before retrying.",
                health.status
            ));
        }
    }
    if models_error.is_some() {
        return Some(
            "The endpoint is reachable, but model discovery failed. Check the proxy logs or rerun login if the upstream site needs auth."
                .to_string(),
        );
    }
    None
}

fn detect_repo_local_proxy_dir_from_launch(
    launch_dir: &Path,
    proxy_id: &str,
    registry: &WorkspaceRegistry,
) -> Option<PathBuf> {
    let candidate = launch_dir.join("needhavesupport").join(proxy_id);
    let canonical = std::fs::canonicalize(candidate).ok()?;
    if !canonical.is_dir() {
        return None;
    }
    registry.authorize(&canonical).ok()?;
    Some(canonical)
}

fn detect_repo_local_proxy_dir(
    proxy_id: &str,
    registry: &WorkspaceRegistry,
) -> Option<PathBuf> {
    let launch_dir = launch_cwd_snapshot()?;
    detect_repo_local_proxy_dir_from_launch(&launch_dir, proxy_id, registry)
}

fn resolve_effective_proxy_dir(
    preset: &ProxyPreset,
    configured_path: Option<&str>,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<Option<PathBuf>, String> {
    if let Some(path) = configured_path.map(str::trim).filter(|value| !value.is_empty()) {
        return resolve_proxy_dir(path, workspace, registry).map(Some);
    }
    Ok(detect_repo_local_proxy_dir(&preset.id, registry))
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

fn package_scripts_info(preset: &ProxyPreset, dir: Option<&Path>) -> ProxyExampleInfo {
    let pkg = dir.and_then(read_package_json);
    let scripts = pkg.as_ref().map(|p| &p.scripts);
    let login_prefix = preset.login_script_prefix.as_str();
    let start_script = preset.start_script.as_str();
    let login_variants = scripts
        .map(|m| {
            let mut names = m
                .keys()
                .filter(|name| name.starts_with(login_prefix))
                .cloned()
                .collect::<Vec<_>>();
            names.sort();
            names
        })
        .unwrap_or_default();
    ProxyExampleInfo {
        id: preset.id.clone(),
        display_name: preset.display_name.clone(),
        path: dir.map(to_canon),
        detected: dir.is_some(),
        has_start_script: scripts.is_some_and(|m| m.contains_key(start_script)),
        has_login_script: scripts.is_some_and(|m| m.keys().any(|name| name.starts_with(login_prefix))),
        default_base_url: preset.default_base_url.clone(),
        login_variants,
    }
}

#[tauri::command]
pub async fn proxyexample_presets(
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<Vec<ProxyExampleInfo>, String> {
    Ok(load_proxy_presets()?
        .iter()
        .map(|preset| {
            let dir = detect_repo_local_proxy_dir(&preset.id, &registry);
            package_scripts_info(preset, dir.as_deref())
        })
        .collect())
}

#[tauri::command]
pub async fn proxyexample_detect(
    proxy_id: String,
    path: Option<String>,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<ProxyExampleInfo, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let preset = get_proxy_preset(&proxy_id)?;
    let dir = resolve_effective_proxy_dir(&preset, path.as_deref(), &workspace, &registry)?;
    Ok(package_scripts_info(&preset, dir.as_deref()))
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
    let preset = get_proxy_preset(&proxy_id)?;
    let dir = resolve_proxy_dir(&path, &workspace, &registry)?;
    let info = package_scripts_info(&preset, Some(&dir));
    if !info.has_start_script {
        return Err(format!(
            "{} does not define an npm start script",
            info.display_name
        ));
    }
    spawn_background_registered(
        &shell_state,
        format!("npm run {}", preset.start_script),
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
    let preset = get_proxy_preset(&proxy_id)?;
    let dir = resolve_proxy_dir(&path, &workspace, &registry)?;
    let info = package_scripts_info(&preset, Some(&dir));
    if !info.has_login_script {
        return Err(format!(
            "{} does not define an npm login script",
            info.display_name
        ));
    }
    let chosen = script
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| preset.login_script_prefix.clone());
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proxy_manifest_loads() {
        let presets = load_proxy_presets().expect("load proxy presets");
        assert!(!presets.is_empty());
        assert!(presets.iter().any(|preset| preset.id == "deepsproxy"));
    }

    #[test]
    fn repo_local_proxy_dir_is_discovered() {
        let temp = tempfile::tempdir().expect("tempdir");
        let support_dir = temp.path().join("needhavesupport").join("deepsproxy");
        std::fs::create_dir_all(&support_dir).expect("create support dir");
        let registry = WorkspaceRegistry::default();

        let detected = detect_repo_local_proxy_dir_from_launch(
            temp.path(),
            "deepsproxy",
            &registry,
        )
            .expect("repo-local proxy dir should be detected");

        assert_eq!(detected, support_dir.canonicalize().expect("canonical path"));
    }

    #[test]
    fn effective_proxy_dir_prefers_explicit_path() {
        let temp = tempfile::tempdir().expect("tempdir");
        let explicit_dir = temp.path().join("manual");
        std::fs::create_dir_all(&explicit_dir).expect("create explicit dir");
        let registry = WorkspaceRegistry::default();
        let preset = ProxyPresetBuilder::new("deepsproxy")
            .display_name("DeepSProxy")
            .default_base_url("http://localhost:11434/v1")
            .start_script("start")
            .login_script_prefix("login")
            .build()
            .expect("preset");

        let resolved = resolve_effective_proxy_dir(
            &preset,
            explicit_dir.to_str(),
            &WorkspaceEnv::Local,
            &registry,
        )
        .expect("resolve explicit path")
        .expect("path");

        assert_eq!(resolved, explicit_dir.canonicalize().expect("canonical path"));
    }
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

#[tauri::command]
pub async fn proxyexample_status(
    proxy_id: String,
    path: Option<String>,
    base_url: String,
    api_key: Option<String>,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<ProxyExampleStatus, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let preset = get_proxy_preset(&proxy_id)?;
    let resolved = resolve_effective_proxy_dir(&preset, path.as_deref(), &workspace, &registry);
    let (dir, path_error) = match resolved {
        Ok(Some(dir)) => (Some(dir), None),
        Ok(None) => (None, Some("no proxy folder configured".to_string())),
        Err(error) => (None, Some(error)),
    };
    let info = package_scripts_info(&preset, dir.as_deref());

    let (health, health_error) = match proxyexample_health(base_url.clone()).await {
        Ok(value) => (Some(value), None),
        Err(error) => (None, Some(error)),
    };

    let models_result = proxyexample_models(base_url, api_key).await;
    let models_reachable = models_result.is_ok();
    let models_error = models_result.err();

    let recovery_hint = infer_recovery_hint(
        path_error.is_none(),
        info.has_login_script,
        health.as_ref(),
        health_error.as_deref(),
        models_error.as_deref(),
    );

    Ok(ProxyExampleStatus {
        proxy_id: info.id,
        display_name: info.display_name,
        configured_path_ok: path_error.is_none(),
        has_start_script: info.has_start_script,
        has_login_script: info.has_login_script,
        health_ok: health.as_ref().is_some_and(|value| value.ok),
        health_status: health.as_ref().map(|value| value.status),
        models_reachable,
        recovery_hint,
        path_error,
        health_error,
        models_error,
    })
}
