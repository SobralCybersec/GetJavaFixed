mod common;

use common::FsFixture;
use javarf_lib::modules::analysis::{compute_safety_snapshot, JavaSafetySnapshot, SafetyKind};
use javarf_lib::modules::workspace::{WorkspaceEnv, WorkspaceRegistry};

#[test]
fn safety_snapshot_git_first_when_repo_has_git() {
    let fx = FsFixture::new();
    fx.write(".git/HEAD", "ref: refs/heads/main\n");
    fx.write("pom.xml", "<project/>\n");

    let snap = compute_safety_snapshot(&fx.root);

    assert_eq!(snap.kind, SafetyKind::GitFirst);
    assert!(snap.rollback_ready);
    assert!(snap.git_branch.is_some());
    assert_eq!(snap.git_branch.as_deref(), Some("main"));
    assert!(snap.message.contains("Git-first"));
}

#[test]
fn safety_snapshot_backup_fallback_when_no_git() {
    let fx = FsFixture::new();
    fx.write("pom.xml", "<project/>\n");

    let snap = compute_safety_snapshot(&fx.root);

    assert_eq!(snap.kind, SafetyKind::BackupFallback);
    assert!(snap.rollback_ready);
    assert!(snap.git_branch.is_none());
    assert!(snap.message.contains("Backup-copy"));
}

#[test]
fn safety_snapshot_git_first_with_detached_head() {
    let fx = FsFixture::new();
    fx.write(".git/HEAD", "abc123def456\n");

    let snap = compute_safety_snapshot(&fx.root);

    assert_eq!(snap.kind, SafetyKind::GitFirst);
    assert!(snap.rollback_ready);
    assert!(snap.git_branch.is_none());
}

#[test]
fn safety_snapshot_walks_up_tree_to_find_git() {
    let fx = FsFixture::new();
    fx.write("subdir/pom.xml", "<project/>\n");
    fx.write(".git/HEAD", "ref: refs/heads/develop\n");

    let snap = compute_safety_snapshot(&fx.root.join("subdir"));

    assert_eq!(snap.kind, SafetyKind::GitFirst);
    assert_eq!(snap.git_branch.as_deref(), Some("develop"));
}
