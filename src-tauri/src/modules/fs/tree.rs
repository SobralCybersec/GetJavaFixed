use std::time::UNIX_EPOCH;

use serde::Serialize;

use crate::modules::workspace::{resolve_path, WorkspaceEnv};

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EntryKind {
    File,
    Dir,
    Symlink,
}

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub kind: EntryKind,
    pub size: u64,
    pub mtime: u64,
}

#[tauri::command]
pub fn fs_read_dir(
    path: String,
    show_hidden: bool,
    workspace: Option<WorkspaceEnv>,
) -> Result<Vec<DirEntry>, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let root = resolve_path(&path, &workspace);
    let read = std::fs::read_dir(&root).map_err(|e| {
        log::debug!("fs_read_dir({}) failed: {e}", root.display());
        e.to_string()
    })?;

    let mut entries: Vec<DirEntry> = read
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let name = entry.file_name().into_string().ok()?;
            let (meta, was_symlink) = match std::fs::metadata(entry.path()) {
                Ok(m) => (Some(m), false),
                Err(_) => (entry.metadata().ok(), true),
            };
            let meta = meta?;

            let kind = if was_symlink {
                EntryKind::Symlink
            } else if meta.is_dir() {
                EntryKind::Dir
            } else {
                EntryKind::File
            };

            if name.starts_with('.') && !show_hidden {
                return None;
            }

            let size = meta.len();
            let mtime = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);

            Some(DirEntry {
                name,
                kind,
                size,
                mtime,
            })
        })
        .collect();

    entries.sort_by(|left, right| {
        let left_rank = match left.kind {
            EntryKind::Dir => 0u8,
            EntryKind::Symlink => 1u8,
            EntryKind::File => 2u8,
        };
        let right_rank = match right.kind {
            EntryKind::Dir => 0u8,
            EntryKind::Symlink => 1u8,
            EntryKind::File => 2u8,
        };
        left_rank
            .cmp(&right_rank)
            .then_with(|| compare_case_insensitive_ascii(&left.name, &right.name))
    });

    Ok(entries)
}

#[tauri::command]
pub fn list_subdirs(
    path: String,
    show_hidden: bool,
    workspace: Option<WorkspaceEnv>,
) -> Result<Vec<String>, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let root = resolve_path(&path, &workspace);
    let read = std::fs::read_dir(&root).map_err(|e| {
        log::debug!("list_subdirs({}) read_dir failed: {e}", root.display());
        e.to_string()
    })?;

    let mut dirs: Vec<String> = read
        .filter_map(Result::ok)
        .filter(|entry| match entry.file_type() {
            Ok(t) if t.is_dir() => true,
            Ok(t) if t.is_symlink() => std::fs::metadata(entry.path())
                .map(|m| m.is_dir())
                .unwrap_or(false),
            _ => false,
        })
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| show_hidden || !name.starts_with('.'))
        .collect();

    dirs.sort_by(|left, right| compare_case_insensitive_ascii(left, right));
    Ok(dirs)
}

fn compare_case_insensitive_ascii(left: &str, right: &str) -> std::cmp::Ordering {
    let mut left_iter = left.bytes();
    let mut right_iter = right.bytes();
    loop {
        match (left_iter.next(), right_iter.next()) {
            (Some(a), Some(b)) => {
                let a = a.to_ascii_lowercase();
                let b = b.to_ascii_lowercase();
                match a.cmp(&b) {
                    std::cmp::Ordering::Equal => continue,
                    other => return other,
                }
            }
            (Some(_), None) => return std::cmp::Ordering::Greater,
            (None, Some(_)) => return std::cmp::Ordering::Less,
            (None, None) => return std::cmp::Ordering::Equal,
        }
    }
}
