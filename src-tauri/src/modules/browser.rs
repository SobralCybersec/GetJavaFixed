use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde::Deserialize;
use serde::Serialize;
use tauri::webview::{NewWindowResponse, WebviewBuilder};
use tauri::{Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl};

use crate::modules::proc::hide_console;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserChoice {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewWebviewCreateResult {
    pub ublock_enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewWebviewUrlPayload {
    pub label: String,
    pub url: String,
}

struct BrowserCandidate {
    id: &'static str,
    name: &'static str,
    commands: &'static [&'static str],
    paths: &'static [&'static str],
}

#[tauri::command]
pub fn browser_list() -> Vec<BrowserChoice> {
    browser_candidates()
        .iter()
        .filter(|candidate| resolve_browser(candidate).is_some())
        .map(|candidate| BrowserChoice {
            id: candidate.id.to_string(),
            name: candidate.name.to_string(),
        })
        .collect()
}

#[tauri::command]
pub fn browser_open(id: String, url: String) -> Result<(), String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("URL is required".to_string());
    }

    let candidate = browser_candidates()
        .iter()
        .find(|candidate| candidate.id == id)
        .ok_or_else(|| format!("Unknown browser: {id}"))?;
    let browser = resolve_browser(candidate)
        .ok_or_else(|| format!("{} is not installed or not on PATH", candidate.name))?;

    let mut command = Command::new(&browser);
    command
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    hide_console(&mut command);
    command
        .spawn()
        .map_err(|e| format!("failed to open {}: {e}", candidate.name))?;
    Ok(())
}

#[tauri::command]
pub async fn preview_webview_create(
    app: tauri::AppHandle,
    window_label: String,
    label: String,
    url: String,
    bounds: WebviewBounds,
) -> Result<PreviewWebviewCreateResult, String> {
    validate_webview_label(&label)?;
    validate_bounds(bounds)?;
    let url = parse_preview_url(&url)?;
    let window = app
        .get_window(&window_label)
        .ok_or_else(|| format!("window not found: {window_label}"))?;

    if let Some(existing) = app.get_webview(&label) {
        let _ = existing.close();
    }

    let mut builder = WebviewBuilder::new(&label, WebviewUrl::External(url))
        .focused(false)
        .disable_drag_drop_handler()
        .enable_clipboard_access()
        .zoom_hotkeys_enabled(true)
        .on_page_load(|webview, payload| {
            let _ = webview.emit(
                "javarf:preview-webview-url",
                PreviewWebviewUrlPayload {
                    label: webview.label().to_string(),
                    url: payload.url().to_string(),
                },
            );
        })
        .on_new_window(|_, _| NewWindowResponse::Allow);

    let ublock_enabled = configure_ublock(&app, &mut builder)?;

    let webview = window
        .add_child(
            builder,
            LogicalPosition::new(bounds.x, bounds.y),
            LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|e| e.to_string())?;
    let _ = webview.show();

    Ok(PreviewWebviewCreateResult { ublock_enabled })
}

#[tauri::command]
pub async fn preview_webview_navigate(
    app: tauri::AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    validate_webview_label(&label)?;
    let url = parse_preview_url(&url)?;
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview not found: {label}"))?;
    webview.navigate(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn preview_webview_reload(app: tauri::AppHandle, label: String) -> Result<(), String> {
    validate_webview_label(&label)?;
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview not found: {label}"))?;
    webview.reload().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn preview_webview_go_back(app: tauri::AppHandle, label: String) -> Result<(), String> {
    eval_preview_history(app, label, "history.back()")
}

#[tauri::command]
pub async fn preview_webview_go_forward(app: tauri::AppHandle, label: String) -> Result<(), String> {
    eval_preview_history(app, label, "history.forward()")
}

#[tauri::command]
pub async fn preview_webview_set_bounds(
    app: tauri::AppHandle,
    label: String,
    bounds: WebviewBounds,
) -> Result<(), String> {
    validate_webview_label(&label)?;
    validate_bounds(bounds)?;
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview not found: {label}"))?;
    webview
        .set_position(LogicalPosition::new(bounds.x, bounds.y))
        .map_err(|e| e.to_string())?;
    webview
        .set_size(LogicalSize::new(bounds.width, bounds.height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn preview_webview_show(app: tauri::AppHandle, label: String) -> Result<(), String> {
    validate_webview_label(&label)?;
    if let Some(webview) = app.get_webview(&label) {
        webview.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn preview_webview_hide(app: tauri::AppHandle, label: String) -> Result<(), String> {
    validate_webview_label(&label)?;
    if let Some(webview) = app.get_webview(&label) {
        webview.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn preview_webview_close(app: tauri::AppHandle, label: String) -> Result<(), String> {
    validate_webview_label(&label)?;
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn browser_candidates() -> &'static [BrowserCandidate] {
    &[
        BrowserCandidate {
            id: "firefox",
            name: "Firefox",
            commands: &["firefox", "firefox.exe"],
            paths: &[
                r"%ProgramFiles%\Mozilla Firefox\firefox.exe",
                r"%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe",
                r"%LocalAppData%\Mozilla Firefox\firefox.exe",
                "/Applications/Firefox.app/Contents/MacOS/firefox",
            ],
        },
        BrowserCandidate {
            id: "chrome",
            name: "Google Chrome",
            commands: &[
                "chrome",
                "chrome.exe",
                "google-chrome",
                "google-chrome-stable",
            ],
            paths: &[
                r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
                r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe",
                r"%LocalAppData%\Google\Chrome\Application\chrome.exe",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            ],
        },
        BrowserCandidate {
            id: "chromium",
            name: "Chromium",
            commands: &["chromium", "chromium-browser", "chromium.exe"],
            paths: &[
                r"%ProgramFiles%\Chromium\Application\chrome.exe",
                r"%ProgramFiles(x86)%\Chromium\Application\chrome.exe",
                r"%LocalAppData%\Chromium\Application\chrome.exe",
                "/Applications/Chromium.app/Contents/MacOS/Chromium",
            ],
        },
        BrowserCandidate {
            id: "edge",
            name: "Microsoft Edge",
            commands: &["msedge", "msedge.exe", "microsoft-edge"],
            paths: &[
                r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe",
                r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe",
                r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe",
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            ],
        },
        BrowserCandidate {
            id: "brave",
            name: "Brave",
            commands: &["brave", "brave-browser", "brave.exe"],
            paths: &[
                r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe",
                r"%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe",
                r"%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe",
                "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            ],
        },
        BrowserCandidate {
            id: "helium",
            name: "Helium",
            commands: &["helium", "helium-browser", "helium.exe"],
            paths: &[
                r"%ProgramFiles%\Helium\helium.exe",
                r"%ProgramFiles%\Helium Browser\helium.exe",
                r"%ProgramFiles(x86)%\Helium\helium.exe",
                r"%LocalAppData%\Helium\helium.exe",
                "/Applications/Helium.app/Contents/MacOS/Helium",
            ],
        },
    ]
}

fn resolve_browser(candidate: &BrowserCandidate) -> Option<PathBuf> {
    for command in candidate.commands {
        if let Some(path) = find_on_path(command) {
            return Some(path);
        }
    }
    candidate
        .paths
        .iter()
        .filter_map(|path| expand_env_path(path))
        .find(|path| path.is_file())
}

fn find_on_path(command: &str) -> Option<PathBuf> {
    let path_env = env::var_os("PATH")?;
    for dir in env::split_paths(&path_env) {
        let candidate = dir.join(command);
        if is_file(&candidate) {
            return Some(candidate);
        }

        #[cfg(windows)]
        if Path::new(command).extension().is_none() {
            for ext in ["exe", "cmd", "bat"] {
                let candidate = dir.join(format!("{command}.{ext}"));
                if is_file(&candidate) {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

fn expand_env_path(path: &str) -> Option<PathBuf> {
    let mut expanded = path.to_string();
    for key in ["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"] {
        let token = format!("%{key}%");
        if expanded.contains(&token) {
            let value = env::var_os(key)?;
            expanded = expanded.replace(&token, &value.to_string_lossy());
        }
    }
    if expanded.contains('%') {
        return None;
    }
    Some(PathBuf::from(expanded))
}

fn is_file(path: &Path) -> bool {
    path.is_file()
}

fn parse_preview_url(url: &str) -> Result<tauri::Url, String> {
    let parsed = tauri::Url::parse(url.trim()).map_err(|e| format!("invalid URL: {e}"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed),
        scheme => Err(format!("unsupported browser URL scheme: {scheme}")),
    }
}

fn validate_webview_label(label: &str) -> Result<(), String> {
    if !label.starts_with("preview_native_") {
        return Err("invalid preview webview label".to_string());
    }
    if label
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '/' | ':' | '_'))
    {
        Ok(())
    } else {
        Err("invalid preview webview label".to_string())
    }
}

fn validate_bounds(bounds: WebviewBounds) -> Result<(), String> {
    if bounds.x.is_finite()
        && bounds.y.is_finite()
        && bounds.width.is_finite()
        && bounds.height.is_finite()
        && bounds.width >= 1.0
        && bounds.height >= 1.0
    {
        Ok(())
    } else {
        Err("invalid preview webview bounds".to_string())
    }
}

fn eval_preview_history(
    app: tauri::AppHandle,
    label: String,
    script: &'static str,
) -> Result<(), String> {
    validate_webview_label(&label)?;
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview not found: {label}"))?;
    webview.eval(script).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn configure_ublock(
    app: &tauri::AppHandle,
    builder: &mut WebviewBuilder<tauri::Wry>,
) -> Result<bool, String> {
    let extensions_dir =
        ublock_extensions_dir(app).ok_or_else(|| "uBlock Origin resources missing".to_string())?;
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("preview-browser-profile");
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    *builder = std::mem::replace(
        builder,
        WebviewBuilder::new("preview_native_placeholder", WebviewUrl::default()),
    )
    .data_directory(data_dir)
    .browser_extensions_enabled(true)
    .extensions_path(extensions_dir);
    Ok(true)
}

#[cfg(not(target_os = "windows"))]
fn configure_ublock(
    _app: &tauri::AppHandle,
    _builder: &mut WebviewBuilder<tauri::Wry>,
) -> Result<bool, String> {
    Ok(false)
}

#[cfg(target_os = "windows")]
fn ublock_extensions_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("extensions"));
    }
    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("extensions"),
    );

    candidates
        .into_iter()
        .find(|path| path.join("ublock").join("manifest.json").is_file())
}
