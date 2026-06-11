use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AniCliArgs {
    pub query: String,
    pub episode: Option<u32>,
    pub quality: Option<String>,
    pub dub: bool,
    pub download: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AniCliCheck {
    pub ani_cli: bool,
    pub mpv: bool,
}

#[tauri::command]
pub fn check_ani_cli() -> AniCliCheck {
    AniCliCheck {
        ani_cli: find_on_path("ani-cli").is_some(),
        mpv: find_on_path("mpv").is_some(),
    }
}

#[tauri::command]
pub fn launch_ani_cli(args: AniCliArgs) -> Result<(), String> {
    let argv = build_ani_cli_args(&args)?;
    let mut command = Command::new("ani-cli");
    command
        .args(argv)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    crate::modules::proc::hide_console(&mut command);
    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn build_ani_cli_args(args: &AniCliArgs) -> Result<Vec<String>, String> {
    let query = args.query.trim();
    if query.is_empty() {
        return Err("query is required".into());
    }

    let mut out = vec![query.to_string()];
    if let Some(episode) = args.episode {
        if episode == 0 {
            return Err("episode must be greater than zero".into());
        }
        out.push("-e".into());
        out.push(episode.to_string());
    }
    if let Some(quality) = args
        .quality
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        match quality {
            "360" | "480" | "720" | "1080" => {
                out.push("-q".into());
                out.push(quality.to_string());
            }
            _ => return Err("quality must be 360, 480, 720, or 1080".into()),
        }
    }
    if args.dub {
        out.push("--dub".into());
    }
    if args.download {
        out.push("-d".into());
    }
    Ok(out)
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        if let Some(found) = candidate_in_dir(&dir, name) {
            return Some(found);
        }
    }
    None
}

fn candidate_in_dir(dir: &Path, name: &str) -> Option<PathBuf> {
    let direct = dir.join(name);
    if direct.is_file() {
        return Some(direct);
    }

    #[cfg(windows)]
    {
        let pathext = std::env::var_os("PATHEXT")
            .and_then(|v| v.into_string().ok())
            .unwrap_or_else(|| ".EXE;.CMD;.BAT".into());
        for ext in pathext.split(';').filter(|v| !v.trim().is_empty()) {
            let candidate = dir.join(format!("{name}{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(query: &str) -> AniCliArgs {
        AniCliArgs {
            query: query.into(),
            episode: None,
            quality: None,
            dub: false,
            download: false,
        }
    }

    #[test]
    fn builds_minimal_query() {
        assert_eq!(
            build_ani_cli_args(&args("one piece")).unwrap(),
            ["one piece"]
        );
    }

    #[test]
    fn builds_episode_quality_dub_and_download_flags() {
        let mut input = args("bleach");
        input.episode = Some(7);
        input.quality = Some("1080".into());
        input.dub = true;
        input.download = true;

        assert_eq!(
            build_ani_cli_args(&input).unwrap(),
            ["bleach", "-e", "7", "-q", "1080", "--dub", "-d"]
        );
    }

    #[test]
    fn rejects_empty_query() {
        assert!(build_ani_cli_args(&args("  ")).is_err());
    }

    #[test]
    fn rejects_bad_quality() {
        let mut input = args("naruto");
        input.quality = Some("1440".into());
        assert!(build_ani_cli_args(&input).is_err());
    }
}
