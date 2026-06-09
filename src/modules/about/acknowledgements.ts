import {
  MANAGED_MCP_PRESET_META,
  REMOTE_MCP_PROVIDER_META,
} from "@/modules/ai/lib/mcpRegistry";

export type CreditEntry = {
  name: string;
  role?: string;
  url?: string;
  note?: string;
};

export const PEOPLE_CREDITS: readonly CreditEntry[] = [
  {
    name: "SobralCybersec",
    role: "Creator and primary maintainer of JavaRf / GetJavaFixed",
    url: "https://github.com/SobralCybersec",
  },
  {
    name: "Wasdubya",
    role: "Author of the x64dbg MCP bridge integrated as the first managed preset",
    url: "https://github.com/wasdubya",
  },
] as const;

export const DOC_CREDITS: readonly CreditEntry[] = [
  {
    name: "Tokyo Ghoul Wiki",
    role: "CCG investigator naming reference",
    url: "https://tokyoghoul.fandom.com/wiki/Ghoul_investigator",
  },
  {
    name: "AI SDK MCP Docs",
    role: "HTTP MCP client integration reference",
    url: "https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools",
  },
  {
    name: "FastMCP Deployment Docs",
    role: "HTTP transport launch reference for the managed x64dbg bridge",
    url: "https://fastmcp.wiki/en/deployment/running-server",
  },
  {
    name: "Tauri OS Plugin Docs",
    role: "Locale resolution reference for OS-language detection",
    url: "https://v2.tauri.app/reference/javascript/os/",
  },
  {
    name: "x64dbg MCP README",
    role: "Local integration and setup reference",
    url: MANAGED_MCP_PRESET_META.x64dbg.docsUrl,
  },
  {
    name: "Exa MCP",
    role: "Remote live-search MCP provider",
    url: REMOTE_MCP_PROVIDER_META.exa.docsUrl,
  },
  {
    name: "Context7",
    role: "Remote version-aware docs MCP provider",
    url: REMOTE_MCP_PROVIDER_META.context7.docsUrl,
  },
] as const;

export const ACKNOWLEDGEMENTS = {
  people: PEOPLE_CREDITS,
  docs: DOC_CREDITS,
} as const;
