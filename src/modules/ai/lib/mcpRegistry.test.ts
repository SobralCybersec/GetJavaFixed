import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTEXT7_MCP_URL,
  EXA_MCP_URL,
  buildRuntimeMcpConfig,
  normalizeMcpProviders,
} from "./mcpRegistry";

describe("mcp registry runtime config", () => {
  it("drops Exa when no API key is available", () => {
    const runtime = buildRuntimeMcpConfig({
      providers: [
        { id: "exa", enabled: true, url: EXA_MCP_URL },
        { id: "context7", enabled: true, url: DEFAULT_CONTEXT7_MCP_URL },
      ],
      managedPresets: [],
    });

    expect(runtime.providers).toEqual([
      {
        id: "context7",
        label: "Context7",
        enabled: true,
        url: DEFAULT_CONTEXT7_MCP_URL,
        auth: "bearer",
        apiKey: undefined,
      },
    ]);
  });

  it("keeps Exa in runtime config when late key resolution is allowed", () => {
    const runtime = buildRuntimeMcpConfig({
      providers: [
        { id: "exa", enabled: true, url: EXA_MCP_URL },
        { id: "context7", enabled: true, url: DEFAULT_CONTEXT7_MCP_URL },
      ],
      managedPresets: [],
      allowMissingToolKeys: true,
    });

    expect(runtime.providers).toEqual([
      {
        id: "context7",
        label: "Context7",
        enabled: true,
        url: DEFAULT_CONTEXT7_MCP_URL,
        auth: "bearer",
        apiKey: undefined,
      },
      {
        id: "exa",
        label: "Exa",
        enabled: true,
        url: EXA_MCP_URL,
        auth: "x-api-key",
        apiKey: undefined,
      },
    ]);
  });

  it("includes healthy managed presets alongside keyed remote providers", () => {
    const runtime = buildRuntimeMcpConfig({
      providers: [
        { id: "exa", enabled: true, url: EXA_MCP_URL },
        { id: "context7", enabled: false, url: DEFAULT_CONTEXT7_MCP_URL },
      ],
      managedPresets: [
        {
          id: "x64dbg",
          enabled: true,
          pythonPath: "python",
          port: 8877,
          upstreamUrl: "http://127.0.0.1:8888/",
        },
      ],
      toolKeys: {
        exa: "exa-key",
      },
      managedHealth: {
        x64dbg: { healthy: true },
      },
    });

    expect(runtime.providers).toEqual([
      {
        id: "exa",
        label: "Exa",
        enabled: true,
        url: EXA_MCP_URL,
        auth: "x-api-key",
        apiKey: "exa-key",
      },
      {
        id: "x64dbg",
        label: "x64dbg MCP",
        enabled: true,
        url: "http://127.0.0.1:8877/mcp",
        auth: "none",
      },
    ]);
  });

  it("migrates legacy MCP preferences into the new provider shape", () => {
    const providers = normalizeMcpProviders(undefined, {
      enabled: false,
      context7Url: "https://docs.example.test/mcp",
    });

    expect(providers).toEqual([
      {
        id: "exa",
        enabled: false,
        url: EXA_MCP_URL,
      },
      {
        id: "context7",
        enabled: false,
        url: "https://docs.example.test/mcp",
      },
    ]);
  });
});
