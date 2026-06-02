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
fn rejects_java_like_folder_without_root_build_file() {
    let fx = FsFixture::new();
    fx.write("src/main/java/App.java", "class App {}\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(!readiness.supported);
    assert_eq!(readiness.project_type, None);
    assert_eq!(
        readiness.reason.as_deref(),
        Some(
            "Java files were found here, but this folder is not supported in Phase 1. Choose another folder whose selected root contains `pom.xml`, `build.gradle`, or `build.gradle.kts`."
        )
    );
}

#[test]
fn rejects_non_java_folder_with_phase1_root_requirement_message() {
    let fx = FsFixture::new();
    fx.write("README.md", "hello\n");

    let readiness = inspect_repo_root(&fx.root).expect("inspect repo root");

    assert!(!readiness.supported);
    assert_eq!(readiness.project_type, None);
    assert_eq!(
        readiness.reason.as_deref(),
        Some(
            "This folder is not supported in Phase 1. Choose another folder whose selected root contains `pom.xml`, `build.gradle`, or `build.gradle.kts`."
        )
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
