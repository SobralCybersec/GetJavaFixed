import type { ResolvedUiLocale } from "./config";

export const messages = {
  en: {
    "settings.tabs.general": "General",
    "settings.tabs.themes": "Themes",
    "settings.tabs.shortcuts": "Shortcuts",
    "settings.tabs.models": "Models",
    "settings.tabs.agents": "Agents",
    "settings.tabs.about": "About",

    "general.title": "General",
    "general.description": "Mode, language, editor, and startup.",
    "general.appearance": "Appearance",
    "general.appearance.system": "System",
    "general.appearance.light": "Light",
    "general.appearance.dark": "Dark",
    "general.appearance.hint":
      "For theme, background and customization, see the Themes tab.",
    "general.language": "Language",
    "general.language.title": "App language",
    "general.language.description":
      "Use the OS language automatically or force English / Portuguese (Brazil).",
    "general.language.system": "System default",
    "general.language.english": "English",
    "general.language.portuguese": "Portuguese (Brazil)",
    "general.zoom": "Zoom",
    "general.zoom.level": "UI zoom level",
    "general.editor": "Editor",
    "general.editor.vim.title": "Vim mode",
    "general.editor.vim.description":
      "Enable Vim keybindings in the code editor.",
    "general.editor.autosave.title": "Auto save",
    "general.editor.autosave.description":
      "Automatically save files after a delay when changes are detected.",
    "general.editor.autosaveDelay.title": "Auto save delay",
    "general.editor.autosaveDelay.description":
      "Delay before unsaved changes are saved automatically.",
    "general.explorer": "Explorer",
    "general.explorer.hidden.title": "Show hidden files",
    "general.explorer.hidden.description":
      "Include dot-prefixed files and folders (.env, .gitignore, .config) in the file explorer and search.",
    "general.terminal": "Terminal",
    "general.terminal.webgl.title": "Use WebGL renderer",
    "general.terminal.webgl.description":
      "Hardware-accelerated rendering. Turn off if text shows corruption or blank tiles.",
    "general.terminal.webgl.info":
      "xterm's WebGL renderer caches glyphs in a GPU texture atlas. On some macOS setups, the atlas can corrupt. Disable it as a fallback.",
    "general.terminal.fontFamily.title": "Font family",
    "general.terminal.fontFamily.description":
      'Nerd Font name for icons (for example "CaskaydiaCove Nerd Font Mono"). Leave blank to auto-detect.',
    "general.terminal.fontFamily.placeholder": "Auto-detect",
    "general.terminal.letterSpacing.title": "Letter spacing",
    "general.terminal.letterSpacing.description":
      "Extra horizontal space between characters (px). Use negative values to tighten Nerd Fonts.",
    "general.terminal.fontSize.title": "Font size",
    "general.terminal.fontSize.description": "Terminal text size.",
    "general.terminal.scrollback.title": "Scrollback",
    "general.terminal.scrollback.description":
      "Lines of history kept per terminal. Higher values use more RAM (~3 KB / line).",
    "general.agents": "Agents",
    "general.agents.notifications.title": "Coding agent notifications",
    "general.agents.notifications.description":
      "Alert when Claude Code or Codex running in a terminal needs your input or finishes. Desktop notification when JavaRf is unfocused, in-app otherwise.",
    "general.startup": "Startup",
    "general.startup.autostart.title": "Launch at login",
    "general.startup.autostart.description":
      "Open JavaRf automatically when you sign in.",
    "general.startup.restoreWindow.title": "Restore window position & size",
    "general.startup.restoreWindow.description":
      "Reopen the main window where you left it. Applies on next launch.",

    "about.title": "About",
    "about.tagline": "Java refactor AI desktop assistant",
    "about.build": "Build",
    "about.bundleId": "Bundle ID",
    "about.license": "License",
    "about.sourceCode": "Source code",
    "about.website": "Website",
    "about.people": "People",
    "about.docs": "Documentation & integrations",
    "about.checkForUpdates": "Check for updates",
    "about.upToDate": "You're up to date",
    "about.checkFailedRetry": "Check failed - retry",
    "about.checking": "Checking...",
    "about.downloading": "Downloading...",
    "about.restartToInstall": "Restart to install",
    "about.installVersion": "Install v{version}",
    "about.updateToVersion": "Update to v{version}",
    "about.viewOnGitHub": "View on GitHub",
    "about.reportIssue": "Report an issue",
    "about.openLink": "Open link",

    "agents.title": "Agents",
    "agents.description":
      "Personas and snippets the AI uses. Switch agents from the input bar.",
    "agents.customInstructions": "Custom instructions",
    "agents.customInstructions.placeholder":
      "For example: always reply in concise bullet points. Prefer pnpm over npm.",
    "agents.customInstructions.help":
      "These instructions apply to the main chat agent. Java refactor previews use the separate Refactor prompt control in Models.",
    "agents.save": "Save",
    "agents.agentsLabel": "Agents",
    "agents.newAgent": "New agent",
    "agents.snippetsLabel": "Snippets",
    "agents.snippetsHelp":
      "Reusable instructions you can drop into any prompt with #handle.",
    "agents.newSnippet": "New snippet",
    "agents.noSnippets":
      "No snippets yet. Create one and insert it with #handle in the AI input.",
    "agents.builtIn": "Built-in",
    "agents.active": "Active",
    "agents.useAgent": "Use agent",
    "agents.edit": "Edit",
    "agents.delete": "Delete",
    "agents.dialog.newAgent": "New agent",
    "agents.dialog.editAgent": "Edit agent",
    "agents.dialog.icon": "Icon",
    "agents.dialog.name": "Name",
    "agents.dialog.description": "Description",
    "agents.dialog.instructions": "Instructions",
    "agents.dialog.instructions.placeholder":
      "Persona and rules. Appended to JavaRf's core system prompt.",
    "agents.dialog.cancel": "Cancel",
    "agents.dialog.save": "Save",
    "agents.dialog.newSnippet": "New snippet",
    "agents.dialog.editSnippet": "Edit snippet",
    "agents.dialog.handle": "Handle",
    "agents.dialog.content": "Content",
    "agents.openModels": "Open models",
    "agents.unavailableDebugger":
      "Requires the x64dbg managed MCP. Enable it in Models and start the local bridge.",

    "models.title": "Models",
    "models.description":
      "Connect the providers you use. Keys live in your OS keychain and are used only by JavaRf.",
    "models.agentResearch": "Agent research",
    "models.agentResearch.description":
      "Remote MCPs power live web and docs research. Managed presets add local specialists like x64dbg.",
    "models.remoteProviders": "Remote HTTP MCPs",
    "models.managedPresets": "Managed local MCPs",
    "models.refactorPromptControl": "Refactor prompt control",
    "models.refactorPromptDescription":
      "This applies only to AI refactor previews. Normal chat keeps using Custom instructions in Agents.",
    "models.openRulesFolder": "Open rules folder",
    "models.openBuilderFile": "Open builder file",

    "mcp.enabled": "Enabled",
    "mcp.disabled": "Disabled",
    "mcp.exa.description":
      "Live web search and fetch for current examples, vendor docs, and external references.",
    "mcp.context7.description":
      "Version-aware library and framework documentation over MCP.",
    "mcp.exa.key": "Exa key",
    "mcp.context7.key": "Context7 key",
    "mcp.context7.url": "Context7 URL",
    "mcp.optionalKey": "Optional key",
    "mcp.optionalExaKey": "Required to activate Exa MCP",
    "mcp.optionalContext7Key": "Optional for authenticated Context7 access",
    "mcp.saveKey": "Save key",
    "mcp.clearKey": "Clear key",
    "mcp.docs": "Docs",
    "mcp.enableManaged.title": "Enable preset",
    "mcp.enableManaged.description":
      "Enabled presets can join agent turns once their local server is healthy.",
    "mcp.pythonPath": "Python executable",
    "mcp.pythonPath.description":
      "Use a python.exe path or a PATH-resolved command like python.",
    "mcp.port": "Local MCP port",
    "mcp.port.description":
      "The local HTTP endpoint JavaRf will call for this preset.",
    "mcp.upstreamUrl": "Upstream debugger URL",
    "mcp.upstreamUrl.description":
      "HTTP URL exposed by the x64dbg plugin itself.",
    "mcp.endpoint": "Local endpoint",
    "mcp.prerequisites": "Prerequisites",
    "mcp.status": "Status",
    "mcp.status.disabled": "Disabled",
    "mcp.status.stopped": "Stopped",
    "mcp.status.starting": "Starting",
    "mcp.status.running": "Running",
    "mcp.status.error": "Error",
    "mcp.toolDiscovery": "Tool discovery",
    "mcp.noTools": "No tools discovered yet.",
    "mcp.start": "Start",
    "mcp.stop": "Stop",
    "mcp.refresh": "Refresh",
    "mcp.installDeps.button": "Install deps",
    "mcp.installDeps.installing": "Installing...",
    "mcp.installDeps.success": "x64dbg Python dependencies installed.",
    "mcp.installDeps.failed": "Dependency install failed",
    "mcp.installDeps.noLaunchDir": "App storage unavailable for dependency install.",
    "mcp.installDeps.windowsOnly": "x64dbg dependency install is only available on Windows.",
    "mcp.installDeps.timedOut": "Dependency install timed out.",
    "mcp.logs": "Logs",
    "mcp.noLogs": "No logs yet.",
    "mcp.setupHint":
      "Enable the preset, confirm Python + the x64dbg HTTP plugin are installed, then start the bridge.",

    "home.tabs.launch": "Launch desk",
    "home.tabs.readiness": "Readiness",
    "home.tabs.workflow": "Workflow",
    "home.hero.badge": "CCG DASHBOARD",
    "home.hero.title": "Terminal-ready refactor control surface.",
    "home.hero.description":
      "Mount the repository, verify model access, and move into analysis through a denser terminal-like workflow instead of generic landing cards.",
    "home.openWorkspace": "Open workspace",
    "home.javaRefactor": "Java refactor",
    "home.javaRefactorDisabled":
      "Connect a model in Settings to unlock Java refactor.",
    "home.kpi.explorer.label": "Explorer",
    "home.kpi.explorer.value": "Workspace gated",
    "home.kpi.explorer.hint":
      "File tree stays locked until a repository is mounted.",
    "home.kpi.models.label": "Models",
    "home.kpi.models.value": "OpenAI-compatible",
    "home.kpi.models.hint":
      "Provider presets and local endpoints share one execution path.",
    "home.kpi.rules.label": "Rules",
    "home.kpi.rules.value": "Editable markdown",
    "home.kpi.rules.hint":
      "Refactor rules remain readable, versioned, and directly tunable.",
    "home.readiness.title": "Ready state",
    "home.readiness.nextAction": "Next action",
    "home.readiness.ready":
      "Models are ready. Open a workspace and start the first analysis.",
    "home.readiness.notReady":
      "Connect a model in Settings, then open a workspace for refactor previews.",
    "home.readiness.summary":
      "This home screen stays intentionally lean: workspace entry, model readiness, and the shortest path into analysis.",
    "home.motion.title": "Motion",
    "home.motion.description":
      "Short transitions only where they explain state changes. Reduced motion stays respected.",
    "home.ruleBase.title": "Rule base",
    "home.ruleBase.description":
      "Markdown rules stay editable, inspectable, and tied to refactor discovery.",
    "home.workflow.title": "Product workflow",
    "home.workflow.description":
      "Organize the app by phases instead of stacking every state in one surface.",
    "home.workflow.intake.title": "01 Intake",
    "home.workflow.intake.description":
      "Open workspace, confirm repo context, keep empty states useful.",
    "home.workflow.analysis.title": "02 Analysis",
    "home.workflow.analysis.description":
      "Run scan, inspect hotspots, and keep details on a full-width surface.",
    "home.workflow.refactor.title": "03 Refactor",
    "home.workflow.refactor.description":
      "Review diffs, queue edits, and apply only after explicit confirmation.",

    "status.privateChannel": "Private channel",
    "status.privateTooltip":
      "AI can't see this terminal's output. Use it for secrets, SSH, or anything you don't want sent to the model.",
    "status.strayDaemon": "stray daemon",

    "agentSwitcher.builtIn": "Built-in",
    "agentSwitcher.custom": "Custom",
    "agentSwitcher.manage": "Manage agents...",

    "agentStatus.openLog": "Open AI log",
    "agentStatus.thinking": "Thinking...",

    "agent.builtin.coder.description":
      "Lead implementer. Writes, edits, runs, and ships code.",
    "agent.builtin.architect.description":
      "Design and tradeoffs. Plans before code.",
    "agent.builtin.reviewer.description":
      "Diff review for correctness, performance, and regressions.",
    "agent.builtin.security.description":
      "Threat-models changes and flags security risks.",
    "agent.builtin.designer.description":
      "UI and UX critique with concrete visual refinements.",
    "agent.builtin.debugger.description":
      "Debugger-driven reverse engineering and live binary triage.",
  },
  "pt-BR": {
    "settings.tabs.general": "Geral",
    "settings.tabs.themes": "Temas",
    "settings.tabs.shortcuts": "Atalhos",
    "settings.tabs.models": "Modelos",
    "settings.tabs.agents": "Agentes",
    "settings.tabs.about": "Sobre",

    "general.title": "Geral",
    "general.description": "Modo, idioma, editor e inicializacao.",
    "general.appearance": "Aparencia",
    "general.appearance.system": "Sistema",
    "general.appearance.light": "Claro",
    "general.appearance.dark": "Escuro",
    "general.appearance.hint":
      "Para tema, plano de fundo e personalizacao, veja a aba Temas.",
    "general.language": "Idioma",
    "general.language.title": "Idioma do app",
    "general.language.description":
      "Use automaticamente o idioma do sistema ou force Ingles / Portugues (Brasil).",
    "general.language.system": "Padrao do sistema",
    "general.language.english": "Ingles",
    "general.language.portuguese": "Portugues (Brasil)",
    "general.zoom": "Zoom",
    "general.zoom.level": "Nivel de zoom da interface",
    "general.editor": "Editor",
    "general.editor.vim.title": "Modo Vim",
    "general.editor.vim.description":
      "Ativa atalhos do Vim no editor de codigo.",
    "general.editor.autosave.title": "Salvar automaticamente",
    "general.editor.autosave.description":
      "Salva arquivos automaticamente apos um atraso quando houver mudancas.",
    "general.editor.autosaveDelay.title": "Atraso do auto save",
    "general.editor.autosaveDelay.description":
      "Tempo antes de salvar mudancas nao salvas automaticamente.",
    "general.explorer": "Explorador",
    "general.explorer.hidden.title": "Mostrar arquivos ocultos",
    "general.explorer.hidden.description":
      "Inclui arquivos e pastas com prefixo de ponto (.env, .gitignore, .config) no explorador e na busca.",
    "general.terminal": "Terminal",
    "general.terminal.webgl.title": "Usar renderizador WebGL",
    "general.terminal.webgl.description":
      "Renderizacao acelerada por hardware. Desative se o texto aparecer corrompido ou em branco.",
    "general.terminal.webgl.info":
      "O renderizador WebGL do xterm usa um atlas de glyphs na GPU. Em alguns setups de macOS ele pode corromper. Desative como fallback.",
    "general.terminal.fontFamily.title": "Familia da fonte",
    "general.terminal.fontFamily.description":
      'Nome da Nerd Font para icones (por exemplo "CaskaydiaCove Nerd Font Mono"). Deixe em branco para detectar automaticamente.',
    "general.terminal.fontFamily.placeholder": "Deteccao automatica",
    "general.terminal.letterSpacing.title": "Espacamento entre letras",
    "general.terminal.letterSpacing.description":
      "Espaco horizontal extra entre caracteres (px). Use valores negativos para compactar Nerd Fonts.",
    "general.terminal.fontSize.title": "Tamanho da fonte",
    "general.terminal.fontSize.description": "Tamanho do texto do terminal.",
    "general.terminal.scrollback.title": "Scrollback",
    "general.terminal.scrollback.description":
      "Linhas de historico mantidas por terminal. Valores maiores usam mais RAM (~3 KB / linha).",
    "general.agents": "Agentes",
    "general.agents.notifications.title": "Notificacoes dos agentes de codigo",
    "general.agents.notifications.description":
      "Avisa quando Claude Code ou Codex em um terminal precisa da sua entrada ou termina. Notificacao desktop quando o JavaRf estiver desfocado, interna caso contrario.",
    "general.startup": "Inicializacao",
    "general.startup.autostart.title": "Abrir ao entrar",
    "general.startup.autostart.description":
      "Abre o JavaRf automaticamente quando voce faz login.",
    "general.startup.restoreWindow.title": "Restaurar posicao e tamanho da janela",
    "general.startup.restoreWindow.description":
      "Reabre a janela principal onde voce deixou. Aplica no proximo inicio.",

    "about.title": "Sobre",
    "about.tagline": "Assistente desktop de IA para refatoracao Java",
    "about.build": "Build",
    "about.bundleId": "Bundle ID",
    "about.license": "Licenca",
    "about.sourceCode": "Codigo-fonte",
    "about.website": "Site",
    "about.people": "Pessoas",
    "about.docs": "Documentacao e integracoes",
    "about.checkForUpdates": "Verificar atualizacoes",
    "about.upToDate": "Voce ja esta na versao atual",
    "about.checkFailedRetry": "Falha na verificacao - tentar de novo",
    "about.checking": "Verificando...",
    "about.downloading": "Baixando...",
    "about.restartToInstall": "Reinicie para instalar",
    "about.installVersion": "Instalar v{version}",
    "about.updateToVersion": "Atualizar para v{version}",
    "about.viewOnGitHub": "Ver no GitHub",
    "about.reportIssue": "Reportar problema",
    "about.openLink": "Abrir link",

    "agents.title": "Agentes",
    "agents.description":
      "Personas e snippets usados pela IA. Troque os agentes pela barra de entrada.",
    "agents.customInstructions": "Instrucoes personalizadas",
    "agents.customInstructions.placeholder":
      "Exemplo: responda sempre em bullets curtas. Prefira pnpm ao inves de npm.",
    "agents.customInstructions.help":
      "Essas instrucoes valem para o agente principal do chat. Previews de refatoracao usam o controle separado de prompt em Modelos.",
    "agents.save": "Salvar",
    "agents.agentsLabel": "Agentes",
    "agents.newAgent": "Novo agente",
    "agents.snippetsLabel": "Snippets",
    "agents.snippetsHelp":
      "Instrucoes reutilizaveis que voce pode inserir em qualquer prompt com #handle.",
    "agents.newSnippet": "Novo snippet",
    "agents.noSnippets":
      "Ainda nao ha snippets. Crie um e insira com #handle na entrada da IA.",
    "agents.builtIn": "Nativo",
    "agents.active": "Ativo",
    "agents.useAgent": "Usar agente",
    "agents.edit": "Editar",
    "agents.delete": "Excluir",
    "agents.dialog.newAgent": "Novo agente",
    "agents.dialog.editAgent": "Editar agente",
    "agents.dialog.icon": "Icone",
    "agents.dialog.name": "Nome",
    "agents.dialog.description": "Descricao",
    "agents.dialog.instructions": "Instrucoes",
    "agents.dialog.instructions.placeholder":
      "Persona e regras. Anexadas ao prompt principal do sistema do JavaRf.",
    "agents.dialog.cancel": "Cancelar",
    "agents.dialog.save": "Salvar",
    "agents.dialog.newSnippet": "Novo snippet",
    "agents.dialog.editSnippet": "Editar snippet",
    "agents.dialog.handle": "Handle",
    "agents.dialog.content": "Conteudo",
    "agents.openModels": "Abrir modelos",
    "agents.unavailableDebugger":
      "Precisa do MCP gerenciado do x64dbg. Ative em Modelos e inicie a ponte local.",

    "models.title": "Modelos",
    "models.description":
      "Conecte os provedores que voce usa. As chaves ficam no keychain do sistema e sao usadas apenas pelo JavaRf.",
    "models.agentResearch": "Pesquisa dos agentes",
    "models.agentResearch.description":
      "MCPs remotos habilitam pesquisa web e docs ao vivo. Presets gerenciados adicionam especialistas locais como x64dbg.",
    "models.remoteProviders": "MCPs HTTP remotos",
    "models.managedPresets": "MCPs locais gerenciados",
    "models.refactorPromptControl": "Controle do prompt de refatoracao",
    "models.refactorPromptDescription":
      "Isto vale apenas para previews de refatoracao por IA. O chat normal continua usando Instrucoes personalizadas em Agentes.",
    "models.openRulesFolder": "Abrir pasta de regras",
    "models.openBuilderFile": "Abrir arquivo gerador",

    "mcp.enabled": "Ativado",
    "mcp.disabled": "Desativado",
    "mcp.exa.description":
      "Busca e fetch web ao vivo para exemplos atuais, docs de fornecedores e referencias externas.",
    "mcp.context7.description":
      "Documentacao de bibliotecas e frameworks com consciencia de versao via MCP.",
    "mcp.exa.key": "Chave Exa",
    "mcp.context7.key": "Chave Context7",
    "mcp.context7.url": "URL do Context7",
    "mcp.optionalKey": "Chave opcional",
    "mcp.optionalExaKey": "Obrigatoria para ativar o MCP da Exa",
    "mcp.optionalContext7Key": "Opcional para acesso autenticado ao Context7",
    "mcp.saveKey": "Salvar chave",
    "mcp.clearKey": "Limpar chave",
    "mcp.docs": "Docs",
    "mcp.enableManaged.title": "Ativar preset",
    "mcp.enableManaged.description":
      "Presets ativados podem entrar nas rodadas dos agentes assim que o servidor local estiver saudavel.",
    "mcp.pythonPath": "Executavel Python",
    "mcp.pythonPath.description":
      "Use um caminho para python.exe ou um comando no PATH como python.",
    "mcp.port": "Porta local do MCP",
    "mcp.port.description":
      "Endpoint HTTP local que o JavaRf vai chamar para este preset.",
    "mcp.upstreamUrl": "URL do debugger upstream",
    "mcp.upstreamUrl.description":
      "URL HTTP exposta pelo plugin do x64dbg.",
    "mcp.endpoint": "Endpoint local",
    "mcp.prerequisites": "Pre-requisitos",
    "mcp.status": "Status",
    "mcp.status.disabled": "Desativado",
    "mcp.status.stopped": "Parado",
    "mcp.status.starting": "Iniciando",
    "mcp.status.running": "Rodando",
    "mcp.status.error": "Erro",
    "mcp.toolDiscovery": "Descoberta de ferramentas",
    "mcp.noTools": "Nenhuma ferramenta descoberta ainda.",
    "mcp.start": "Iniciar",
    "mcp.stop": "Parar",
    "mcp.refresh": "Atualizar",
    "mcp.installDeps.button": "Instalar deps",
    "mcp.installDeps.installing": "Instalando...",
    "mcp.installDeps.success": "Dependencias Python do x64dbg instaladas.",
    "mcp.installDeps.failed": "Falha ao instalar dependencias",
    "mcp.installDeps.noLaunchDir": "Armazenamento do app indisponivel para instalar dependencias.",
    "mcp.installDeps.windowsOnly": "A instalacao de dependencias do x64dbg so esta disponivel no Windows.",
    "mcp.installDeps.timedOut": "A instalacao de dependencias expirou.",
    "mcp.logs": "Logs",
    "mcp.noLogs": "Ainda sem logs.",
    "mcp.setupHint":
      "Ative o preset, confirme Python + plugin HTTP do x64dbg instalados e depois inicie a ponte.",

    "home.tabs.launch": "Mesa de lancamento",
    "home.tabs.readiness": "Prontidao",
    "home.tabs.workflow": "Fluxo",
    "home.hero.badge": "PAINEL CCG",
    "home.hero.title": "Superficie de controle pronta para terminal.",
    "home.hero.description":
      "Monte o repositorio, valide o acesso a modelos e avance para a analise por um fluxo mais denso e orientado a terminal.",
    "home.openWorkspace": "Abrir workspace",
    "home.javaRefactor": "Refatoracao Java",
    "home.javaRefactorDisabled":
      "Conecte um modelo em Configuracoes para liberar a refatoracao Java.",
    "home.kpi.explorer.label": "Explorador",
    "home.kpi.explorer.value": "Workspace bloqueado",
    "home.kpi.explorer.hint":
      "A arvore de arquivos fica bloqueada ate um repositorio ser montado.",
    "home.kpi.models.label": "Modelos",
    "home.kpi.models.value": "OpenAI-compatible",
    "home.kpi.models.hint":
      "Presets de provedores e endpoints locais compartilham o mesmo fluxo de execucao.",
    "home.kpi.rules.label": "Regras",
    "home.kpi.rules.value": "Markdown editavel",
    "home.kpi.rules.hint":
      "As regras de refatoracao continuam legiveis, versionadas e ajustaveis diretamente.",
    "home.readiness.title": "Estado pronto",
    "home.readiness.nextAction": "Proxima acao",
    "home.readiness.ready":
      "Os modelos estao prontos. Abra um workspace e inicie a primeira analise.",
    "home.readiness.notReady":
      "Conecte um modelo em Configuracoes e depois abra um workspace para previews de refatoracao.",
    "home.readiness.summary":
      "Esta tela inicial fica intencionalmente enxuta: entrada do workspace, prontidao dos modelos e o caminho mais curto ate a analise.",
    "home.motion.title": "Movimento",
    "home.motion.description":
      "Transicoes curtas apenas quando ajudam a explicar mudancas de estado. Reduced motion continua respeitado.",
    "home.ruleBase.title": "Base de regras",
    "home.ruleBase.description":
      "As regras em markdown continuam editaveis, inspecionaveis e ligadas a descoberta de refatoracoes.",
    "home.workflow.title": "Fluxo do produto",
    "home.workflow.description":
      "Organize o app por fases em vez de empilhar todos os estados numa unica superficie.",
    "home.workflow.intake.title": "01 Intake",
    "home.workflow.intake.description":
      "Abra o workspace, confirme o contexto do repo e mantenha estados vazios uteis.",
    "home.workflow.analysis.title": "02 Analysis",
    "home.workflow.analysis.description":
      "Rode o scan, inspecione hotspots e mantenha detalhes em uma superficie larga.",
    "home.workflow.refactor.title": "03 Refactor",
    "home.workflow.refactor.description":
      "Revise diffs, enfileire edicoes e aplique somente apos confirmacao explicita.",

    "status.privateChannel": "Canal privado",
    "status.privateTooltip":
      "A IA nao ve a saida deste terminal. Use para segredos, SSH ou qualquer coisa que voce nao queira enviar ao modelo.",
    "status.strayDaemon": "daemon perdido",

    "agentSwitcher.builtIn": "Nativos",
    "agentSwitcher.custom": "Customizados",
    "agentSwitcher.manage": "Gerenciar agentes...",

    "agentStatus.openLog": "Abrir log da IA",
    "agentStatus.thinking": "Pensando...",

    "agent.builtin.coder.description":
      "Implementador principal. Escreve, edita, executa e entrega codigo.",
    "agent.builtin.architect.description":
      "Design e trade-offs. Planeja antes de codar.",
    "agent.builtin.reviewer.description":
      "Revisao de diff para corretude, performance e regressao.",
    "agent.builtin.security.description":
      "Faz threat model das mudancas e sinaliza riscos de seguranca.",
    "agent.builtin.designer.description":
      "Critica de UI e UX com refinamentos visuais concretos.",
    "agent.builtin.debugger.description":
      "Engenharia reversa guiada por debugger e triagem binaria ao vivo.",
  },
} as const satisfies Record<ResolvedUiLocale, Record<string, string>>;

export type MessageKey = keyof typeof messages.en;
