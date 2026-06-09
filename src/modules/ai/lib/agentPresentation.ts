import type { Agent } from "./agents";
import type { TranslateFn } from "@/modules/i18n";

export function getAgentDisplay(agent: Agent, t: TranslateFn): {
  name: string;
  description: string;
} {
  if (!agent.builtIn) {
    return {
      name: agent.name,
      description: agent.description,
    };
  }

  switch (agent.id) {
    case "builtin:coder":
      return { name: agent.name, description: t("agent.builtin.coder.description") };
    case "builtin:architect":
      return {
        name: agent.name,
        description: t("agent.builtin.architect.description"),
      };
    case "builtin:reviewer":
      return {
        name: agent.name,
        description: t("agent.builtin.reviewer.description"),
      };
    case "builtin:security":
      return {
        name: agent.name,
        description: t("agent.builtin.security.description"),
      };
    case "builtin:designer":
      return {
        name: agent.name,
        description: t("agent.builtin.designer.description"),
      };
    case "builtin:debugger":
      return {
        name: agent.name,
        description: t("agent.builtin.debugger.description"),
      };
    default:
      return {
        name: agent.name,
        description: agent.description,
      };
  }
}
