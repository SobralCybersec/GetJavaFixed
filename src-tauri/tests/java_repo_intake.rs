mod common;

use common::FsFixture;
use javarf_lib::modules::java_repo::{classify_selected_root, inspect_repo_root, JavaProjectType};
use javarf_lib::modules::workspace::{WorkspaceEnv, WorkspaceRegistry};

#[test]
fn detects_maven_root_from_pom_xml() {
    let fx = FsFixture::new();
    fx.write("pom.xml", "<project/>");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Maven));
    assert!(readiness.reason.is_none());
}

#[test]
fn detects_gradle_root_from_build_gradle() {
    let fx = FsFixture::new();
    fx.write("build.gradle", "plugins {}\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Gradle));
    assert!(readiness.reason.is_none());
}

#[test]
fn detects_gradle_root_from_build_gradle_kts() {
    let fx = FsFixture::new();
    fx.write("build.gradle.kts", "plugins {}\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Gradle));
    assert!(readiness.reason.is_none());
}

#[test]
fn detects_node_root_from_package_json() {
    let fx = FsFixture::new();
    fx.write("package.json", r#"{"scripts":{"test":"vitest"}}"#);

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Node));
    assert!(readiness.reason.is_none());
}

#[test]
fn detects_rust_root_from_cargo_toml() {
    let fx = FsFixture::new();
    fx.write(
        "Cargo.toml",
        "[package]\nname = \"demo\"\nversion = \"0.1.0\"\n",
    );

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Rust));
    assert!(readiness.reason.is_none());
}

#[test]
fn supports_java_like_folder_without_root_build_file_as_generic_workspace() {
    let fx = FsFixture::new();
    fx.write("src/main/java/App.java", "class App {}\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Generic));
    assert_eq!(
        readiness.reason.as_deref(),
        Some("Generic code workspace. No language-specific root manifest was detected, so analysis will use safe polyglot heuristics.")
    );
}

#[test]
fn supports_non_manifest_folder_as_generic_workspace() {
    let fx = FsFixture::new();
    fx.write("README.md", "hello\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Generic));
    assert_eq!(
        readiness.reason.as_deref(),
        Some("Generic code workspace. No language-specific root manifest was detected, so analysis will use safe polyglot heuristics.")
    );
}

#[test]
fn classify_selected_root_authorizes_and_returns_repo_name() {
    let fx = FsFixture::new();
    fx.write("pom.xml", "<project/>");
    let registry = WorkspaceRegistry::default();
    let path = fx.root_str();

    let readiness =
        classify_selected_root(&path, &WorkspaceEnv::Local, &registry).expect("classify root");

    assert!(readiness.supported);
    assert_eq!(readiness.project_type, Some(JavaProjectType::Maven));
    assert_eq!(
        readiness.repo_name,
        fx.root.file_name().unwrap().to_string_lossy()
    );
    assert!(registry.is_authorized(&fx.root));
}
