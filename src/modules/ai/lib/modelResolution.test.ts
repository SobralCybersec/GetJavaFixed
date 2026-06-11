import { describe, expect, it } from "vitest";
import { matchDiscoveredModel } from "./modelResolution";

describe("matchDiscoveredModel", () => {
  it.each([
    ["deepseek-v4-pro", "deepseek-v4-pro"],
    ["deepseek-v4-pro-thinking", "deepseek-v4-pro-thinking"],
    ["deepseek-v4-flash", "deepseek-v4-flash"],
    ["deepseek-v4-flash-thinking", "deepseek-v4-flash-thinking"],
    ["k2-d6", "kimi-k2.6"],
    ["k2d6", "kimi-k2.6"],
    ["k2-d6-thinking", "kimi-k2.6-thinking"],
    ["k2d6-thinking", "kimi-k2.6-thinking"],
    ["qwen3.7-max", "qwen3.7-max"],
    ["qwen-3.7-max", "qwen3.7-max"],
    ["qwen-3.6-plus", "qwen3.6-plus"],
    ["qwen3.6_plus", "qwen3.6-plus"],
    ["qwen-3.6-plus-thinking", "qwen3.6-plus-thinking"],
  ])("maps %s to %s", (raw, expected) => {
    expect(matchDiscoveredModel(raw)?.modelId).toBe(expected);
  });

  it.each([
    ["moonshot/k2d6-thinking", "kimi", "kimi-k2.6-thinking"],
    ["models/qwen_3.6_plus_thinking", "qwen", "qwen3.6-plus-thinking"],
    ["fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct", "fireworks", "accounts/fireworks/models/llama-v3p3-70b-instruct"],
  ] as const)("handles provider and separator variants for %s", (raw, provider, expected) => {
    expect(matchDiscoveredModel(raw, provider)?.modelId).toBe(expected);
  });

  it("returns thinking provider options and context metadata", () => {
    const match = matchDiscoveredModel("k2d6-thinking");

    expect(match?.runtimeModelId).toBe("kimi-k2.6");
    expect(match?.contextLimit).toBe(256_000);
    expect(match?.providerOptions).toEqual({
      kimi: { thinking: { type: "enabled" } },
    });
  });

  it("returns null for unknown proxy ids", () => {
    expect(matchDiscoveredModel("unknown-provider/strange-model")).toBeNull();
  });
});
