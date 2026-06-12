import { describe, expect, it } from "vitest";
import {
  BUILTIN_AGENTS,
  resolveAgentForContext,
  resolveAgentsForContext,
} from "./agents";

function agentById(id: string) {
  const agent = BUILTIN_AGENTS.find((entry) => entry.id === id);
  if (!agent) {
    throw new Error(`Missing built-in agent: ${id}`);
  }
  return agent;
}

describe("theme-aware built-in agents", () => {
  it("resolves general agents from the active anime theme", () => {
    const resolved = resolveAgentForContext(agentById("builtin:coder"), "one-piece");

    expect(resolved.name).toBe("Franky");
    expect(resolved.role).toBe("Coder");
    expect(resolved.instructions).toContain("You are Franky");
  });

  it("resolves cybersecurity agents from the active anime theme", () => {
    const resolved = resolveAgentForContext(
      agentById("builtin:cyber-osint-recon"),
      "naruto",
    );

    expect(resolved.name).toBe("Neji Hyuga");
    expect(resolved.role).toBe("OSINT");
    expect(resolved.instructions).toContain("You are Neji Hyuga");
  });

  it("resolves debugger persona from the active anime theme", () => {
    const resolved = resolveAgentForContext(agentById("builtin:debugger"), "dragon-ball");

    expect(resolved.name).toBe("Dr. Gero");
    expect(resolved.role).toBe("Debugger");
    expect(resolved.instructions).toContain("You are Dr. Gero");
  });

  it("keeps remote process inspection wired to the managed x64dbg preset", () => {
    const debuggerAgent = agentById("builtin:debugger");

    expect(debuggerAgent.family).toBe("cybersecurity");
    expect(debuggerAgent.requiresManagedMcp).toBe("x64dbg");
    expect(debuggerAgent.description).toContain("Remote process inspection");
  });

  it("falls back to neutral theme when the theme id is unknown", () => {
    const resolved = resolveAgentForContext(
      agentById("builtin:cyber-post-exploration"),
      "unknown-theme",
    );

    expect(resolved.name).toBe("Bastion");
    expect(resolved.role).toBe("Remediation");
    expect(resolved.instructions).toContain("You are Bastion");
  });

  it("filters and resolves cybersecurity agents as a themed family", () => {
    const resolved = resolveAgentsForContext(BUILTIN_AGENTS, "one-piece", "cybersecurity");

    expect(resolved.map((agent) => agent.name)).toEqual(
      expect.arrayContaining([
        "Usopp",
        "Tony Tony Chopper",
        "Brook",
        "Jinbe",
        "Trafalgar Law",
      ]),
    );
  });

  it("does not reuse general-agent names for cybersecurity agents in the same theme", () => {
    const themes = [
      "tokyo-ghoul",
      "dragon-ball",
      "gintama",
      "naruto",
      "bungou-stray-dogs",
      "solo-leveling",
      "one-piece",
      "javarf-default",
    ];

    const overlaps = themes.flatMap((theme) => {
      const generalNames = new Set(
        resolveAgentsForContext(BUILTIN_AGENTS, theme, "general").map(
          (agent) => agent.name,
        ),
      );
      return resolveAgentsForContext(BUILTIN_AGENTS, theme, "cybersecurity")
        .map((agent) => agent.name)
        .filter((name) => generalNames.has(name))
        .map((name) => `${theme}:${name}`);
    });

    expect(overlaps).toEqual([]);
  });
});
