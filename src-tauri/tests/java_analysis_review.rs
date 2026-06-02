mod common;

use common::FsFixture;
use javarf_lib::modules::analysis::{scan_findings, Phase1Finding};

fn category_count(findings: &[Phase1Finding], category: &str) -> usize {
    findings.iter().filter(|f| f.category == category).count()
}

#[test]
fn scan_findings_returns_safe_performance_and_modernization_categories() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/App.java",
        r#"
import java.util.*;

public class App {
    public static void main(String[] args) {
        Vector<String> v = new Vector<>();
        for (int i = 0; i < args.length; i++) {
            System.out.println(args[i]);
        }
        if (args.length > 0) {
            String result = "";
            for (int j = 0; j < args.length; j++) {
                result = result + args[j];
            }
            System.out.println(result);
        }
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        category_count(&findings, "safe") >= 1,
        "Expected at least one safe finding"
    );
    assert!(
        category_count(&findings, "performance") >= 1,
        "Expected at least one performance finding"
    );
    assert!(
        category_count(&findings, "modernization") >= 1,
        "Expected at least one modernization finding"
    );
}

#[test]
fn scan_findings_detects_empty_catch_block() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Handler.java",
        r#"
public class Handler {
    public void process() {
        try {
            doWork();
        } catch (Exception e) {
        }
    }
    private void doWork() {}
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let empty_catch = findings.iter().find(|f| f.id.contains("empty-catch"));

    assert!(empty_catch.is_some(), "Expected empty catch block finding");
    assert_eq!(empty_catch.unwrap().category, "safe");
}

#[test]
fn scan_findings_detects_string_concat_in_loop() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Builder.java",
        r#"
public class Builder {
    public String join(String[] parts) {
        String result = "";
        for (int i = 0; i < parts.length; i++) {
            result = result + parts[i];
        }
        return result;
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let string_concat = findings
        .iter()
        .find(|f| f.id.contains("string-concat-loop"));

    assert!(
        string_concat.is_some(),
        "Expected string concat in loop finding"
    );
    assert_eq!(string_concat.unwrap().category, "performance");
}

#[test]
fn scan_findings_detects_size_in_loop_condition() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Loop.java",
        r#"
import java.util.List;
public class Loop {
    public void process(List<String> items) {
        for (int i = 0; i < items.size(); i++) {
            System.out.println(items.get(i));
        }
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let size_in_loop = findings.iter().find(|f| f.id.contains("size-in-loop"));

    assert!(size_in_loop.is_some(), "Expected size in loop finding");
    assert_eq!(size_in_loop.unwrap().category, "performance");
}

#[test]
fn scan_findings_detects_legacy_collections() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Old.java",
        r#"
import java.util.Vector;
import java.util.Hashtable;
import java.util.Enumeration;

public class Old {
    private Vector<String> v = new Vector<>();
    private Hashtable<String, Integer> h = new Hashtable<>();
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let legacy = findings
        .iter()
        .find(|f| f.id.contains("legacy-collections"));

    assert!(legacy.is_some(), "Expected legacy collections finding");
    assert_eq!(legacy.unwrap().category, "modernization");
}

#[test]
fn scan_findings_detects_raw_types() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Raw.java",
        r#"
import java.util.List;
public class Raw {
    private List items;
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let raw_type = findings.iter().find(|f| f.id.contains("raw-type"));

    assert!(raw_type.is_some(), "Expected raw type finding");
    assert_eq!(raw_type.unwrap().category, "modernization");
}

#[test]
fn scan_findings_detects_wildcard_imports() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Wildcard.java",
        "import java.util.*;\npublic class Wildcard {}\n",
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let wildcard = findings.iter().find(|f| f.id.contains("wildcard-import"));

    assert!(wildcard.is_some(), "Expected wildcard import finding");
    assert_eq!(wildcard.unwrap().category, "safe");
}

#[test]
fn scan_findings_detects_deep_nesting() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Nested.java",
        r#"
public class Nested {
    public void run(boolean a, boolean b, boolean c) {
        if (a) {
            for (int i = 0; i < 3; i++) {
                if (b) {
                    while (c) {
                        System.out.println(i);
                        break;
                    }
                }
            }
        }
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        findings.iter().any(|f| f.id.contains("deep-nesting")),
        "Expected deep nesting finding"
    );
}

#[test]
fn scan_findings_detects_duplicate_logic() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Duplicate.java",
        r#"
public class Duplicate {
    public void run() {
        normalizeUser();
        normalizeUser();
        normalizeUser();
    }

    private void normalizeUser() {}
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        findings.iter().any(|f| f.id.contains("duplicate-code")),
        "Expected duplicate code finding"
    );
}

#[test]
fn scan_findings_detects_potential_null_pattern() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/NullRisk.java",
        r#"
public class NullRisk {
    public boolean isAdmin(String role) {
        return role.equals("ADMIN");
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        findings.iter().any(|f| f.id.contains("potential-null")),
        "Expected null-risk finding"
    );
}

#[test]
fn scan_findings_detects_repeated_call_cache_opportunity() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/Cache.java",
        r#"
public class Cache {
    public void run(Service service) {
        for (int i = 0; i < 3; i++) {
            String value = service.fetchConfig();
            if (service.fetchConfig().isEmpty()) {
                System.out.println(value);
            }
        }
    }
}
interface Service { String fetchConfig(); }
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        findings
            .iter()
            .any(|f| f.id.contains("repeated-call-cache")),
        "Expected repeated-call-cache finding"
    );
}

#[test]
fn scan_findings_detects_tell_dont_ask_candidate() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/AccountService.java",
        r#"
public class AccountService {
    public void withdraw(Account account, int amount) {
        if (account.getBalance() >= amount) {
            account.debit(amount);
        }
    }
}
interface Account {
    int getBalance();
    void debit(int amount);
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    assert!(
        findings.iter().any(|f| f.id.contains("tell-dont-ask")),
        "Expected tell-dont-ask finding"
    );
}

#[test]
fn scan_findings_sorts_by_priority_descending() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/App.java",
        r#"
import java.util.*;
public class App {
    public static void main(String[] args) {
        System.out.println("test");
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    for i in 0..findings.len().saturating_sub(1) {
        assert!(
            findings[i].priority >= findings[i + 1].priority,
            "Findings should be sorted by priority descending"
        );
    }
}

#[test]
fn scan_findings_deduplicates_by_id() {
    let fx = FsFixture::new();
    fx.write(
        "src/main/java/App.java",
        r#"
import java.util.*;
public class App {
    public static void main(String[] args) {
        System.out.println("test");
        System.out.println("test2");
    }
}
"#,
    );

    let findings = scan_findings(&fx.root).expect("scan_findings");
    let println_ids: Vec<_> = findings
        .iter()
        .filter(|f| f.id.starts_with("println:"))
        .map(|f| f.id.clone())
        .collect();

    assert_eq!(
        println_ids.len(),
        println_ids
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len(),
        "IDs should be unique"
    );
}
