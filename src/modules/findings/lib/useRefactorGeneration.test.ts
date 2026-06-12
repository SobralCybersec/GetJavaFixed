import { describe, expect, it } from "vitest";
import {
  detectRefactorLanguageProfileId,
  isLikelyCompleteJavaFile,
} from "./useRefactorGeneration";

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

  it("detects assembly language profiles from asm files", () => {
    const asm = [
      "global _start",
      "section .text",
      "_start:",
      "    mov rax, 60",
      "    xor rdi, rdi",
      "    syscall",
    ].join("\n");

    expect(detectRefactorLanguageProfileId("src/main.asm", asm)).toBe("assembly");
  });
});
