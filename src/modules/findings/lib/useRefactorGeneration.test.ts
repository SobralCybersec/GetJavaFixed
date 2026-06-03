import { describe, expect, it } from "vitest";
import { isLikelyCompleteJavaFile } from "./useRefactorGeneration";

describe("useRefactorGeneration output validation", () => {
  it("rejects truncated java output", () => {
    const original = [
      "package demo;",
      "",
      "public class Sample {",
      "  void run() {",
      "    System.out.println(\"ok\");",
      "  }",
      "}",
    ].join("\n");

    const truncated = [
      "package demo;",
      "",
      "public class Sample {",
      "  void run() {",
      "    System.out.println(\"ok\");",
    ].join("\n");

    expect(isLikelyCompleteJavaFile(original, truncated)).toBe(false);
  });

  it("accepts a complete java file", () => {
    const original = [
      "package demo;",
      "",
      "public class Sample {",
      "  void run() {",
      "    System.out.println(\"ok\");",
      "  }",
      "}",
    ].join("\n");

    const proposed = [
      "package demo;",
      "",
      "public class Sample {",
      "  void run() {",
      "    System.out.println(\"ready\");",
      "  }",
      "}",
    ].join("\n");

    expect(isLikelyCompleteJavaFile(original, proposed)).toBe(true);
  });
});
