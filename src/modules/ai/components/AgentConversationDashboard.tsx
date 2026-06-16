import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewPane } from "@/modules/preview/PreviewPane";
import type { AiDiffTab } from "@/modules/tabs";
import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  Alert02Icon,
  ApiIcon,
  Globe02Icon,
  RobotIcon,
  Settings02Icon,
  Tick02Icon,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/modules/i18n";
import { loadLinkPreviewMeta } from "../lib/linkPreview";
import { buildConversationSummary } from "../lib/conversationSummary";
import { loadMessages, type SessionMeta } from "../lib/sessions";
import { getOrCreateChat, useChatStore } from "../store/chatStore";

const EMPTY_CHAT_SESSION_ID = "__agent-dashboard__";
const STATUS_LABEL_KEY = {
  idle: "agentDashboard.status.idle",
  thinking: "agentDashboard.status.thinking",
  streaming: "agentDashboard.status.streaming",
  "awaiting-approval": "agentDashboard.status.awaitingApproval",
  error: "agentDashboard.status.error",
} as const;

type DashboardSection = "overview" | "work" | "resources" | "sessions" | "mcp" | "settings";

type Props = {
  aiDiffTabs: ReadonlyArray<AiDiffTab>;
  onOpenBrowser: (url: string) => void;
};

export function AgentConversationDashboard({
  aiDiffTabs,
  onOpenBrowser,
}: Props) {
  const { t } = useI18n();
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const switchSession = useChatStore((s) => s.switchSession);
  const agentMeta = useChatStore((s) => s.agentMeta);
  const sessionId = activeSessionId ?? EMPTY_CHAT_SESSION_ID;
  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const { messages } = useChat<UIMessage>({ chat });
  const liveMessages = activeSessionId ? messages : [];
  const summary = useMemo(
    () => buildConversationSummary({ messages: liveMessages, aiDiffTabs }),
    [aiDiffTabs, liveMessages],
  );
  const [selectedUrl, setSelectedUrl] = useState("");
  const [metaByUrl, setMetaByUrl] = useState<
    Record<string, Awaited<ReturnType<typeof loadLinkPreviewMeta>>>
  >({});
  const [query, setQuery] = useState("");
  const [messageCache, setMessageCache] = useState<Record<string, UIMessage[]>>({});
  const [selectedNode, setSelectedNode] = useState("agent");
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");

  useEffect(() => {
    let alive = true;
    void Promise.all(
      sessions.map(async (session) => {
        if (session.id === activeSessionId) {
          return [session.id, liveMessages] as const;
        }
        const cached = await loadMessages(session.id);
        return [session.id, cached ?? []] as const;
      }),
    ).then((entries) => {
      if (!alive) return;
      setMessageCache(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [activeSessionId, liveMessages, sessions]);

  useEffect(() => {
    const firstUrl = summary.resources[0]?.url ?? "";
    setSelectedUrl((current) => {
      if (current && summary.resources.some((resource) => resource.url === current)) {
        return current;
      }
      return firstUrl;
    });
  }, [summary.resources]);

  useEffect(() => {
    let alive = true;
    const remote = summary.resources.filter((resource) => resource.kind === "remote");
    if (remote.length === 0) {
      setMetaByUrl({});
      return () => {
        alive = false;
      };
    }
    void Promise.all(
      remote.map(async (resource) => [
        resource.url,
        await loadLinkPreviewMeta(resource.url),
      ] as const),
    ).then((entries) => {
      if (!alive) return;
      setMetaByUrl(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [summary.resources]);

  const totalTokens = agentMeta.tokens.inputTokens + agentMeta.tokens.outputTokens;
  const searchResults = useMemo(
    () =>
      searchConversations({
        sessions,
        messagesBySession: {
          ...messageCache,
          ...(activeSessionId ? { [activeSessionId]: liveMessages } : {}),
        },
        query,
      }),
    [activeSessionId, liveMessages, messageCache, query, sessions],
  );
  const graph = useMemo(
    () =>
      buildNeuralGraph(summary, agentMeta.approvalsPending, {
        user: t("agentDashboard.node.user"),
        agent: t("agentDashboard.node.agent"),
        tools: t("agentDashboard.node.tools"),
        resources: t("agentDashboard.node.resources"),
        changes: t("agentDashboard.node.changes"),
        approvals: t("agentDashboard.node.approvals"),
      }),
    [agentMeta.approvalsPending, summary, t],
  );
  const sections: Array<{ id: DashboardSection; label: string; icon?: typeof RobotIcon }> = [
    { id: "overview", label: t("agentDashboard.section.overview"), icon: RobotIcon },
    { id: "work", label: t("agentDashboard.section.work"), icon: ToolsIcon },
    { id: "resources", label: t("agentDashboard.section.resources"), icon: Globe02Icon },
    { id: "sessions", label: t("agentDashboard.section.sessions"), icon: RobotIcon },
    { id: "mcp", label: t("agentDashboard.section.mcp", { defaultValue: "MCP & Config" }), icon: ApiIcon },
    { id: "settings", label: t("agentDashboard.section.settings", { defaultValue: "Settings" }), icon: Settings02Icon },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4 lg:px-7 lg:py-5">
        <section className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-primary">
                <HugeiconsIcon icon={RobotIcon} size={14} strokeWidth={1.8} />
                <span>{t("agentDashboard.eyebrow")}</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {t("agentDashboard.title")}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {t("agentDashboard.description")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(STATUS_LABEL_KEY[agentMeta.status])}</Badge>
              {agentMeta.step ? (
                <Badge variant="outline">{agentMeta.step}</Badge>
              ) : null}
              {agentMeta.approvalsPending > 0 ? (
                <Badge variant="destructive">
                  {t("agentDashboard.pendingApprovals", {
                    count: agentMeta.approvalsPending,
                  })}
                </Badge>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedUrl}
                onClick={() => selectedUrl && onOpenBrowser(selectedUrl)}
              >
                {t("agentDashboard.openBrowser")}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border/60 bg-background/55 p-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={
                  section.id === activeSection
                    ? "flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    : "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              >
                {section.icon ? <HugeiconsIcon icon={section.icon} size={14} strokeWidth={1.8} /> : null}
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="min-h-0 flex-1">
          <Card
            size="sm"
            className={
              activeSection === "sessions"
                ? "min-h-0 border border-border/70 bg-card/80"
                : "hidden"
            }
          >
            <CardHeader className="border-b border-border/60">
              <CardTitle>{t("agentDashboard.sessions")}</CardTitle>
              <CardDescription>{t("agentDashboard.sessionsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-0">
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border/60 px-4 pb-3">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("agentDashboard.searchPlaceholder")}
                    className="h-8 bg-background/70 text-xs"
                  />
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {query.trim()
                      ? t("agentDashboard.searchCount", {
                          count: searchResults.length,
                        })
                      : t("agentDashboard.searchHint")}
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-2 px-4 pb-4 pt-3">
                    {(query.trim() ? searchResults : sessions).map((item) => {
                    const session =
                      "session" in item ? item.session : item;
                    const active = session.id === activeSessionId;
                    return (
                      <button
                        key={"session" in item ? item.key : session.id}
                        type="button"
                        onClick={() => switchSession(session.id)}
                        className={
                          active
                            ? "w-full rounded-lg border border-primary/40 bg-primary/10 p-3 text-left"
                            : "w-full rounded-lg border border-border/60 bg-background/60 p-3 text-left hover:border-primary/30 hover:bg-accent/35"
                        }
                      >
                        <div className="truncate text-sm font-medium text-foreground">
                          {session.title}
                        </div>
                        {"snippet" in item ? (
                          <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                            {item.snippet}
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(session.updatedAt).toLocaleString()}
                          </div>
                        )}
                      </button>
                    );
                  })}
                    {query.trim() && searchResults.length === 0 ? (
                      <EmptyLine>{t("agentDashboard.searchEmpty")}</EmptyLine>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <div
            className={
              activeSection === "overview" || activeSection === "work"
                ? "grid min-h-0 gap-4"
                : "hidden"
            }
          >
            <section
              className={
                activeSection === "overview"
                  ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  : "hidden"
              }
            >
              <StatCard
                icon={RobotIcon}
                label={t("agentDashboard.stats.messages")}
                value={String(summary.stats.messages)}
                detail={t("agentDashboard.stats.messagesDetail", {
                  user: summary.stats.userMessages,
                  assistant: summary.stats.assistantMessages,
                })}
              />
              <StatCard
                icon={ToolsIcon}
                label={t("agentDashboard.stats.toolCalls")}
                value={String(summary.stats.toolCalls)}
                detail={t("agentDashboard.stats.toolCallsDetail", {
                  count: summary.stats.pendingApprovals,
                })}
              />
              <StatCard
                icon={Globe02Icon}
                label={t("agentDashboard.stats.resources")}
                value={String(summary.stats.resources)}
                detail={t("agentDashboard.stats.resourcesDetail")}
              />
              <StatCard
                icon={Tick02Icon}
                label={t("agentDashboard.stats.tokens")}
                value={String(totalTokens)}
                detail={t("agentDashboard.stats.tokensDetail", {
                  input: agentMeta.tokens.inputTokens,
                  output: agentMeta.tokens.outputTokens,
                })}
              />
            </section>

            <div
              className={
                activeSection === "overview"
                  ? "grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
                  : "hidden"
              }
            >
              <Card size="sm" className="border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.charts")}</CardTitle>
                  <CardDescription>{t("agentDashboard.chartsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
                  <DonutChart
                    label={t("agentDashboard.chartMessages")}
                    values={[
                      {
                        label: t("agentDashboard.chartUser"),
                        value: summary.stats.userMessages,
                        color: "#38bdf8",
                      },
                      {
                        label: t("agentDashboard.chartAssistant"),
                        value: summary.stats.assistantMessages,
                        color: "#f59e0b",
                      },
                    ]}
                  />
                  <BarChart
                    label={t("agentDashboard.chartWorkload")}
                    values={[
                      {
                        label: t("agentDashboard.chartTools"),
                        value: summary.stats.toolCalls,
                      },
                      {
                        label: t("agentDashboard.chartChanges"),
                        value: summary.stats.changes,
                      },
                      {
                        label: t("agentDashboard.chartIssues"),
                        value: summary.stats.issues,
                      },
                      {
                        label: t("agentDashboard.chartResources"),
                        value: summary.stats.resources,
                      },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card size="sm" className="border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.neuralMap")}</CardTitle>
                  <CardDescription>{t("agentDashboard.neuralMapDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="py-4">
                  <NeuralMap
                    graph={graph}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    selectedLabel={t("agentDashboard.selectedNode")}
                    selectedDescription={t("agentDashboard.neuralMapSelectedDescription")}
                  />
                </CardContent>
              </Card>
            </div>

            <div
              className={
                activeSection === "work"
                  ? "grid min-h-0 gap-4 lg:grid-cols-2"
                  : "hidden"
              }
            >
              <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.changes")}</CardTitle>
                  <CardDescription>{t("agentDashboard.changesDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 px-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 px-4 pb-4">
                      {summary.changes.length === 0 ? (
                        <EmptyLine>{t("agentDashboard.changesEmpty")}</EmptyLine>
                      ) : (
                        summary.changes.map((change) => (
                          <div
                            key={change.key}
                            className="rounded-lg border border-border/60 bg-background/60 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium">
                                {change.title}
                              </div>
                              {change.status ? (
                                <Badge variant="outline" className="ml-auto">
                                  {change.status}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                              {change.path}
                            </div>
                            <div className="mt-2 text-[12px] text-muted-foreground">
                              {change.detail}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.issues")}</CardTitle>
                  <CardDescription>{t("agentDashboard.issuesDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 px-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 px-4 pb-4">
                      {summary.issues.length === 0 ? (
                        <EmptyLine>{t("agentDashboard.issuesEmpty")}</EmptyLine>
                      ) : (
                        summary.issues.map((issue) => (
                          <div
                            key={issue.key}
                            className="rounded-lg border border-border/60 bg-background/60 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={Alert02Icon}
                                size={14}
                                strokeWidth={1.8}
                                className="shrink-0 text-amber-500"
                              />
                              <div className="text-sm leading-6">{issue.summary}</div>
                            </div>
                            {issue.severity ? (
                              <div className="mt-2">
                                <Badge variant="outline">{issue.severity}</Badge>
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div
              className={
                activeSection === "work"
                  ? "grid min-h-0 gap-4 lg:grid-cols-2"
                  : "hidden"
              }
            >
              <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.activity")}</CardTitle>
                  <CardDescription>{t("agentDashboard.activityDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 px-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 px-4 pb-4">
                      {summary.toolCalls.length === 0 ? (
                        <EmptyLine>{t("agentDashboard.activityEmpty")}</EmptyLine>
                      ) : (
                        summary.toolCalls.map((toolCall) => (
                          <div
                            key={toolCall.key}
                            className="rounded-lg border border-border/60 bg-background/60 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
                                {toolCall.toolName}
                              </div>
                              <Badge variant="outline" className="ml-auto">
                                {toolCall.state}
                              </Badge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {toolCall.detail}
                            </div>
                            {toolCall.needsApproval ? (
                              <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                                {t("agentDashboard.activityNeedsApproval")}
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <CardTitle>{t("agentDashboard.latest")}</CardTitle>
                  <CardDescription>{t("agentDashboard.latestDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 flex-1">
                  {summary.latestAssistantNote ? (
                    <pre className="h-full overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-background/60 p-3 text-[12px] leading-6 text-muted-foreground">
                      {summary.latestAssistantNote}
                    </pre>
                  ) : (
                    <EmptyLine>{t("agentDashboard.latestEmpty")}</EmptyLine>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div
            className={
              activeSection === "resources"
                ? "grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
                : "hidden"
            }
          >
            <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
              <CardHeader className="border-b border-border/60">
                <CardTitle>{t("agentDashboard.resources")}</CardTitle>
                <CardDescription>{t("agentDashboard.resourcesDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 px-0">
                <ScrollArea className="h-full">
                  <div className="space-y-2 px-4 pb-4">
                    {summary.resources.length === 0 ? (
                      <EmptyLine>{t("agentDashboard.resourcesEmpty")}</EmptyLine>
                    ) : (
                      summary.resources.map((resource) => {
                        const meta = metaByUrl[resource.url];
                        const active = resource.url === selectedUrl;
                        return (
                          <button
                            key={resource.url}
                            type="button"
                            onClick={() => setSelectedUrl(resource.url)}
                            className={
                              active
                                ? "w-full rounded-lg border border-primary/40 bg-primary/10 p-3 text-left"
                                : "w-full rounded-lg border border-border/60 bg-background/60 p-3 text-left hover:border-primary/30 hover:bg-accent/35"
                            }
                          >
                            <div className="truncate text-sm font-medium text-foreground">
                              {meta?.title || resource.host}
                            </div>
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">
                              {resource.path}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Badge variant="outline">{resource.source}</Badge>
                              <span>{resource.kind}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card size="sm" className="min-h-0 border border-border/70 bg-card/80">
              <CardHeader className="border-b border-border/60">
                <CardTitle>{t("agentDashboard.preview")}</CardTitle>
                <CardDescription>{t("agentDashboard.previewDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1">
                <div className="h-[min(56vh,520px)] min-h-[260px] min-w-0 overflow-hidden sm:min-h-[340px]">
                  <PreviewPane
                    id={0}
                    url={selectedUrl}
                    visible={true}
                    onUrlChange={setSelectedUrl}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            className={
              activeSection === "mcp"
                ? "grid min-h-0 gap-4"
                : "hidden"
            }
          >
            <Card size="sm" className="border border-border/70 bg-card/80">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={ApiIcon} size={18} strokeWidth={1.8} />
                  {t("agentDashboard.mcp", { defaultValue: "MCP & Agent Config" })}
                </CardTitle>
                <CardDescription>{t("agentDashboard.mcpDescription", { defaultValue: "Configure Model Context Protocol servers and agent-specific settings" })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">MCP Servers</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Browse and edit the markdown rules that feed AI refactor previews. Changes save directly into the app-local refactor rules folder.</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <span className="text-[11px]">+ Add MCP Server</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Active Servers</div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <div className="text-xs text-muted-foreground">No servers configured</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Agent Behavior</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Enable tool calling</span>
                      <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Auto-execute approved tools</span>
                      <input type="checkbox" className="h-4 w-4 rounded" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sandbox execution</span>
                      <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Tool Timeout Configuration</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <div className="text-sm text-muted-foreground">Default timeout: <span className="font-mono text-foreground">30s</span></div>
                    <div className="text-sm text-muted-foreground">Max retries: <span className="font-mono text-foreground">3</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            className={
              activeSection === "settings"
                ? "grid min-h-0 gap-4"
                : "hidden"
            }
          >
            <Card size="sm" className="border border-border/70 bg-card/80">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={Settings02Icon} size={18} strokeWidth={1.8} />
                  {t("agentDashboard.settings", { defaultValue: "Settings" })}
                </CardTitle>
                <CardDescription>{t("agentDashboard.settingsDescription", { defaultValue: "Configure agent behavior and dashboard preferences" })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Agent Configuration</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Auto-approve tool calls</span>
                      <input type="checkbox" className="h-4 w-4 rounded" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Verbose output</span>
                      <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Display Preferences</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Show token estimates</span>
                      <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Compact view</span>
                      <input type="checkbox" className="h-4 w-4 rounded" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Show timestamps</span>
                      <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Resource Management</div>
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <div className="text-sm text-muted-foreground">Max resources to display: <span className="font-mono text-foreground">50</span></div>
                    <div className="text-sm text-muted-foreground">Cache preview data: <span className="font-mono text-foreground">24h</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: typeof RobotIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card size="sm" className="border border-border/70 bg-card/80">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-primary">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type ChartValue = {
  label: string;
  value: number;
  color?: string;
};

function DonutChart({
  label,
  values,
}: {
  label: string;
  values: ChartValue[];
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * 34;
  let offset = 0;

  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <svg viewBox="0 0 96 96" className="size-20 shrink-0 sm:size-24">
          <circle
            cx="48"
            cy="48"
            r="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/70"
          />
          {values.map((item) => {
            const fraction = total > 0 ? item.value / total : 0;
            const dash = fraction * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={item.label}
                cx="48"
                cy="48"
                r="34"
                fill="none"
                stroke={item.color ?? "#38bdf8"}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                transform="rotate(-90 48 48)"
              />
            );
          })}
          <text
            x="48"
            y="52"
            textAnchor="middle"
            className="fill-foreground text-[16px] font-semibold"
          >
            {total}
          </text>
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          {values.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color ?? "#38bdf8" }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.label}
              </span>
              <span className="font-mono text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarChart({
  label,
  values,
}: {
  label: string;
  values: ChartValue[];
}) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-4 space-y-3">
        {values.map((item, index) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-mono text-foreground">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (item.value / max) * 100)}%`,
                  backgroundColor:
                    item.color ??
                    ["#38bdf8", "#f59e0b", "#ef4444", "#22c55e"][index % 4],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type NeuralNode = {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
};

type NeuralEdge = {
  from: string;
  to: string;
  value: number;
};

type NeuralGraph = {
  nodes: NeuralNode[];
  edges: NeuralEdge[];
};

function NeuralMap({
  graph,
  selectedNode,
  onSelectNode,
  selectedLabel,
  selectedDescription,
}: {
  graph: NeuralGraph;
  selectedNode: string;
  onSelectNode: (id: string) => void;
  selectedLabel: string;
  selectedDescription: string;
}) {
  const selected = graph.nodes.find((node) => node.id === selectedNode) ?? graph.nodes[0];
  const maxNode = Math.max(1, ...graph.nodes.map((node) => node.value));
  const maxEdge = Math.max(1, ...graph.edges.map((edge) => edge.value));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <svg
        viewBox="0 0 520 260"
        role="img"
        aria-label="Agent neural map"
        className="min-h-52 w-full rounded-lg border border-border/60 bg-background/70 sm:min-h-64"
      >
        <defs>
          <radialGradient id="agent-node-glow">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {graph.edges.map((edge) => {
          const from = graph.nodes.find((node) => node.id === edge.from);
          const to = graph.nodes.find((node) => node.id === edge.to);
          if (!from || !to) return null;
          const active = selectedNode === from.id || selectedNode === to.id;
          return (
            <line
              key={`${edge.from}:${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? "#38bdf8" : "currentColor"}
              strokeOpacity={active ? 0.8 : 0.22}
              strokeWidth={1 + (edge.value / maxEdge) * 5}
              className="text-muted-foreground"
            />
          );
        })}
        {graph.nodes.map((node) => {
          const active = node.id === selectedNode;
          const radius = 16 + (node.value / maxNode) * 14;
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectNode(node.id);
                }
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 12}
                fill={active ? "url(#agent-node-glow)" : "transparent"}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={active ? "#0ea5e9" : "#111827"}
                stroke={active ? "#bae6fd" : "#64748b"}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                className="pointer-events-none fill-white text-[11px] font-semibold"
              >
                {node.value}
              </text>
              <text
                x={node.x}
                y={node.y + radius + 18}
                textAnchor="middle"
                className="pointer-events-none fill-muted-foreground text-[11px]"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rounded-lg border border-border/60 bg-background/60 p-3">
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
          {selectedLabel}
        </div>
        <div className="mt-2 text-sm font-medium text-foreground">
          {selected?.label ?? "-"}
        </div>
        <div className="mt-1 font-mono text-2xl font-semibold">
          {selected?.value ?? 0}
        </div>
        <div className="mt-3 text-[12px] leading-5 text-muted-foreground">
          {selectedDescription}
        </div>
      </div>
    </div>
  );
}

function buildNeuralGraph(
  summary: ReturnType<typeof buildConversationSummary>,
  approvalsPending: number,
  labels: Record<"user" | "agent" | "tools" | "resources" | "changes" | "approvals", string>,
): NeuralGraph {
  const nodes: NeuralNode[] = [
    { id: "user", label: labels.user, value: summary.stats.userMessages, x: 72, y: 128 },
    { id: "agent", label: labels.agent, value: summary.stats.assistantMessages, x: 246, y: 128 },
    { id: "tools", label: labels.tools, value: summary.stats.toolCalls, x: 430, y: 58 },
    { id: "resources", label: labels.resources, value: summary.stats.resources, x: 430, y: 198 },
    { id: "changes", label: labels.changes, value: summary.stats.changes, x: 270, y: 222 },
    { id: "approvals", label: labels.approvals, value: approvalsPending, x: 258, y: 36 },
  ];
  const edges: NeuralEdge[] = [
    { from: "user", to: "agent", value: summary.stats.messages },
    { from: "agent", to: "tools", value: summary.stats.toolCalls },
    { from: "agent", to: "resources", value: summary.stats.resources },
    { from: "agent", to: "changes", value: summary.stats.changes },
    { from: "tools", to: "approvals", value: approvalsPending },
    { from: "tools", to: "changes", value: summary.stats.changes },
    { from: "resources", to: "changes", value: Math.min(summary.stats.resources, summary.stats.changes) },
  ];
  return { nodes, edges };
}

type ConversationSearchResult = {
  key: string;
  session: SessionMeta;
  snippet: string;
};

function searchConversations({
  sessions,
  messagesBySession,
  query,
}: {
  sessions: ReadonlyArray<SessionMeta>;
  messagesBySession: Record<string, ReadonlyArray<UIMessage>>;
  query: string;
}): ConversationSearchResult[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  const results: ConversationSearchResult[] = [];
  for (const session of sessions) {
    const messages = messagesBySession[session.id] ?? [];
    for (const message of messages) {
      const text = messageText(message);
      const index = text.toLocaleLowerCase().indexOf(needle);
      if (index === -1) continue;
      results.push({
        key: `${session.id}:${message.id}`,
        session,
        snippet: snippetAround(text, index, needle.length),
      });
      break;
    }
  }
  return results.slice(0, 40);
}

function messageText(message: UIMessage): string {
  const chunks: string[] = [];
  for (const rawPart of message.parts ?? []) {
    if (!rawPart || typeof rawPart !== "object") continue;
    const part = rawPart as Record<string, unknown>;
    if (typeof part.text === "string") chunks.push(part.text);
    if (typeof part.toolName === "string") chunks.push(part.toolName);
    if (part.input && typeof part.input === "object") {
      chunks.push(JSON.stringify(part.input));
    }
  }
  return chunks.join("\n");
}

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 56);
  const end = Math.min(text.length, index + length + 96);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function EmptyLine({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
