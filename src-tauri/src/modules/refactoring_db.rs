use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::modules::fs::to_canon;

const RULES_DIR_NAME: &str = "refactoring-db";

const MANIFEST_NAME: &str = "manifest.json";

const DEFAULT_MANIFEST: &str = include_str!("../../../src/modules/ai/refactoring-db/manifest.json");
const DEFAULT_ADD_GENERICS: &str =
    include_str!("../../../src/modules/ai/refactoring-db/add-generics-to-raw-types.md");
const DEFAULT_AVOID_UNNEEDED_ABSTRACTIONS: &str =
    include_str!("../../../src/modules/ai/refactoring-db/avoid-unneeded-abstractions.md");
const DEFAULT_CACHE_COLLECTION_SIZE: &str =
    include_str!("../../../src/modules/ai/refactoring-db/cache-collection-size-before-loop.md");
const DEFAULT_CACHE_REPEATED_METHOD_CALLS: &str =
    include_str!("../../../src/modules/ai/refactoring-db/cache-repeated-method-calls.md");
const DEFAULT_EXTRACT_DUPLICATE_LOGIC: &str =
    include_str!("../../../src/modules/ai/refactoring-db/extract-duplicate-logic.md");
const DEFAULT_EXTRACT_METHOD: &str =
    include_str!("../../../src/modules/ai/refactoring-db/extract-method.md");
const DEFAULT_HARDEN_NULL_SENSITIVE_CALLS: &str =
    include_str!("../../../src/modules/ai/refactoring-db/harden-null-sensitive-calls.md");
const DEFAULT_INTRODUCE_PARAMETER_OBJECT: &str =
    include_str!("../../../src/modules/ai/refactoring-db/introduce-parameter-object.md");
const DEFAULT_LEGACY_COLLECTIONS: &str =
    include_str!("../../../src/modules/ai/refactoring-db/replace-legacy-collections.md");
const DEFAULT_MODERNIZE_INSTANCEOF: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/modernize-instanceof-pattern-matching.md"
);
const DEFAULT_REFACTOR_SWITCH: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/refactor-switch-to-pattern-matching.md"
);
const DEFAULT_REPLACE_CONDITIONAL: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/replace-conditional-with-polymorphism.md"
);
const DEFAULT_REPLACE_EMPTY_CATCH: &str =
    include_str!("../../../src/modules/ai/refactoring-db/replace-empty-catch-with-handling.md");
const DEFAULT_REPLACE_LOOP_CONCAT: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/replace-loop-string-concat-with-string-builder.md"
);
const DEFAULT_REPLACE_NESTED_CONDITIONAL: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/replace-nested-conditional-with-guard-clauses.md"
);
const DEFAULT_REPLACE_SYSTEM_OUT: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/replace-system-out-println-with-logger.md"
);
const DEFAULT_REPLACE_TEMP: &str =
    include_str!("../../../src/modules/ai/refactoring-db/replace-temp-with-query.md");
const DEFAULT_REPLACE_WILDCARD: &str =
    include_str!("../../../src/modules/ai/refactoring-db/replace-wildcard-imports.md");
const DEFAULT_SINGLE_RESPONSIBILITY: &str = include_str!(
    "../../../src/modules/ai/refactoring-db/single-responsibility-extraction.md"
);
const DEFAULT_TELL_DONT_ASK: &str =
    include_str!("../../../src/modules/ai/refactoring-db/tell-dont-ask.md");

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RefactorManifest {
    version: u64,
    rules: Vec<RefactorManifestRule>,
    #[serde(default)]
    gaps: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct RefactorManifestRule {
    id: String,
    title: String,
    category: String,
    principles: Vec<String>,
    #[serde(default)]
    trigger_prefixes: Vec<String>,
    #[serde(default)]
    default_guidance: String,
    #[serde(default)]
    tags: Vec<String>,
    file: String,
}

fn default_file_map() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("manifest.json", DEFAULT_MANIFEST),
        ("add-generics-to-raw-types.md", DEFAULT_ADD_GENERICS),
        (
            "avoid-unneeded-abstractions.md",
            DEFAULT_AVOID_UNNEEDED_ABSTRACTIONS,
        ),
        (
            "cache-collection-size-before-loop.md",
            DEFAULT_CACHE_COLLECTION_SIZE,
        ),
        (
            "cache-repeated-method-calls.md",
            DEFAULT_CACHE_REPEATED_METHOD_CALLS,
        ),
        ("extract-duplicate-logic.md", DEFAULT_EXTRACT_DUPLICATE_LOGIC),
        ("extract-method.md", DEFAULT_EXTRACT_METHOD),
        (
            "harden-null-sensitive-calls.md",
            DEFAULT_HARDEN_NULL_SENSITIVE_CALLS,
        ),
        (
            "introduce-parameter-object.md",
            DEFAULT_INTRODUCE_PARAMETER_OBJECT,
        ),
        ("replace-legacy-collections.md", DEFAULT_LEGACY_COLLECTIONS),
        (
            "modernize-instanceof-pattern-matching.md",
            DEFAULT_MODERNIZE_INSTANCEOF,
        ),
        (
            "refactor-switch-to-pattern-matching.md",
            DEFAULT_REFACTOR_SWITCH,
        ),
        (
            "replace-conditional-with-polymorphism.md",
            DEFAULT_REPLACE_CONDITIONAL,
        ),
        (
            "replace-empty-catch-with-handling.md",
            DEFAULT_REPLACE_EMPTY_CATCH,
        ),
        (
            "replace-loop-string-concat-with-string-builder.md",
            DEFAULT_REPLACE_LOOP_CONCAT,
        ),
        (
            "replace-nested-conditional-with-guard-clauses.md",
            DEFAULT_REPLACE_NESTED_CONDITIONAL,
        ),
        (
            "replace-system-out-println-with-logger.md",
            DEFAULT_REPLACE_SYSTEM_OUT,
        ),
        ("replace-temp-with-query.md", DEFAULT_REPLACE_TEMP),
        ("replace-wildcard-imports.md", DEFAULT_REPLACE_WILDCARD),
        (
            "single-responsibility-extraction.md",
            DEFAULT_SINGLE_RESPONSIBILITY,
        ),
        ("tell-dont-ask.md", DEFAULT_TELL_DONT_ASK),
    ])
}

fn rules_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(RULES_DIR_NAME);
    Ok(dir)
}

fn ensure_rules_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = rules_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let defaults = default_file_map();
    for (name, content) in defaults {
        let path = dir.join(name);
        if !path.exists() {
            std::fs::write(&path, content).map_err(|e| e.to_string())?;
        }
    }
    Ok(dir)
}

#[tauri::command]
pub fn refactor_rules_root(app: tauri::AppHandle) -> Result<String, String> {
    let dir = ensure_rules_dir(&app)?;
    Ok(to_canon(&dir))
}

#[tauri::command]
pub fn refactor_rules_list(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = ensure_rules_dir(&app)?;
    let manifest: RefactorManifest = serde_json::from_str(
        &std::fs::read_to_string(dir.join(MANIFEST_NAME)).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(manifest.rules.into_iter().map(|rule| rule.file).collect())
}

#[tauri::command]
pub fn refactor_rules_export_defaults(app: tauri::AppHandle) -> Result<String, String> {
    let dir = ensure_rules_dir(&app)?;
    Ok(to_canon(&dir))
}

pub fn manifest_path(dir: &Path) -> PathBuf {
    dir.join(MANIFEST_NAME)
}
