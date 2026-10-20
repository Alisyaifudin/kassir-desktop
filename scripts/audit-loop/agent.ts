/**
 * Agent session lifecycle for the audit loop.
 *
 * Each iteration gets fresh in-memory sessions so context never leaks between
 * passes. Global pi packages are loaded once (to register custom providers),
 * then the agents themselves run with a clean resource loader and an explicit
 * system prompt.
 */

import { createWriteStream } from "node:fs";
import { resolve, sep } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  resolveCliModel,
  SessionManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import type { AgentSessionServices } from "@earendil-works/pi-coding-agent";
import type { LoopConfig, ThinkingLevel } from "./config";
import { ensureDirForFile } from "./state";
import { checkReadonlyCommand } from "./tools";
import { color, log, oneLine, shortPath, warn } from "./ui";

export type AgentRole = "auditor" | "fixer";

export interface ResolvedAgentModel {
  model: any;
  thinkingLevel: ThinkingLevel;
  label: string;
  warning?: string;
}

export interface CreateServicesResult {
  services: AgentSessionServices;
}

const GIT_MUTATION_RE =
  /\bgit\s+(?:-[cC]\s+\S+\s+)*(add|commit|push|pull|fetch|reset|checkout|switch|restore|clean|rm|mv|merge|rebase|stash|tag|apply|am|config)\b|\bbranch\s+-[dDmM]\b/;

function isInside(child: string, parent: string): boolean {
  const childAbs = resolve(child);
  const parentAbs = resolve(parent);
  return childAbs === parentAbs || childAbs.startsWith(`${parentAbs}${sep}`);
}

function bashWritesToAudit(command: string, auditDir: string): boolean {
  // Only match the real audit directory (or a relative `audit/` path). A repo
  // path like /tmp/audit-e2e must not trip this guard.
  const mentionsAudit =
    command.includes(auditDir) ||
    /(^|[\s"'=])(?:\.\/)?audit(?:\/|\s|$)/.test(command);
  if (!mentionsAudit) return false;
  return />|\btee\b|\bsed\s+-[a-zA-Z]*i\b|\bpython3?\s+-c\b|\bnode\s+-e\b|\bbun\s+-e\b/.test(command);
}

/**
 * Hard guardrails enforced inside the agent loop. The system prompts say the
 * same things, but a guard is cheap insurance against a model ignoring them.
 */
function guardExtension(role: AgentRole, cwd: string, auditDir: string) {
  return (pi: any) => {
    pi.on("tool_call", (event: any) => {
      if (role === "fixer" && event.toolName === "bash") {
        const command = String(event.input?.command ?? "");
        if (GIT_MUTATION_RE.test(command)) {
          return {
            block: true,
            reason:
              "The fixer must not mutate git history. The harness commits after the pass. " +
              "Use `git status`, `git diff`, and `git log` only.",
          };
        }
        if (bashWritesToAudit(command, auditDir)) {
          return {
            block: true,
            reason:
              "The fixer must not write to audit/ through bash. Use record_fix for notes; " +
              "the harness owns toc.md, state.json, and report files.",
          };
        }
      }

      if (role === "fixer" && (event.toolName === "write" || event.toolName === "edit")) {
        const path = String(event.input?.path ?? "");
        if (path && isInside(path, auditDir)) {
          return {
            block: true,
            reason:
              "The fixer must not edit files under audit/. Use record_fix to record the outcome " +
              "for a report; the harness regenerates audit/toc.md and audit/state.json.",
          };
        }
        if (path && !isInside(path, cwd)) {
          return {
            block: true,
            reason:
              "The fixer must keep file edits inside the repository. Use the repo's own scripts " +
              "or a bash heredoc for temporary checks instead of writing to /tmp.",
          };
        }
      }

      if (role === "auditor" && event.toolName === "bash") {
        const command = String(event.input?.command ?? "");
        const blocked = checkReadonlyCommand(command);
        if (blocked) {
          return {
            block: true,
            reason: `The auditor is read-only: ${blocked}. Use run_readonly_command, or read/grep/find/ls.`,
          };
        }
      }

      return undefined;
    });
  };
}

export interface StartAgentOptions {
  role: AgentRole;
  config: LoopConfig;
  modelRuntime: any;
  settingsManager: any;
  agentDir: string;
  model: any;
  thinkingLevel: ThinkingLevel;
  systemPrompt: string;
  tools: string[];
  customTools: any[];
  iteration: number;
  logPath: string;
}

export interface AgentHandle {
  session: AgentSession;
  dispose: () => Promise<void>;
}

function usageSummary(session: AgentSession): string {
  let input = 0;
  let output = 0;
  for (const message of session.messages as any[]) {
    const usage = message?.usage;
    if (!usage) continue;
    input += usage.input ?? 0;
    output += usage.output ?? 0;
  }
  return `${input.toLocaleString()} in / ${output.toLocaleString()} out tokens`;
}

export async function startAgent(options: StartAgentOptions): Promise<AgentHandle> {
  const {
    role,
    config,
    modelRuntime,
    settingsManager,
    agentDir,
    model,
    thinkingLevel,
    systemPrompt,
    tools,
    customTools,
    iteration,
    logPath,
  } = options;
  const cwd = config.cwd;

  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    // Use an override rather than `systemPrompt`: the loader treats a string
    // `systemPrompt` as a possible file path first and logs a read warning.
    systemPromptOverride: () => systemPrompt,
    extensionFactories: [guardExtension(role, cwd, config.auditDir)],
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    settingsManager,
    model,
    thinkingLevel,
    tools,
    customTools,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(cwd),
  });

  await ensureDirForFile(logPath);
  const file = createWriteStream(logPath, { flags: "a" });
  file.write(`# ${role} — iteration ${String(iteration).padStart(3, "0")}\n\n`);
  file.write(`- Model: ${model?.provider ?? "?"}/${model?.id ?? "?"}\n`);
  file.write(`- Thinking: ${thinkingLevel}\n`);
  file.write(`- Started: ${new Date().toISOString()}\n\n`);

  const prefix = role === "auditor" ? color.magenta("[auditor]") : color.blue("[fixer]");
  let assistantLineOpen = false;

  const unsubscribe = session.subscribe((event: any) => {
    switch (event.type) {
      case "message_update": {
        const delta = event.assistantMessageEvent;
        if (delta?.type === "text_delta" && typeof delta.delta === "string") {
          if (!assistantLineOpen) {
            process.stdout.write(`\n${prefix} `);
            assistantLineOpen = true;
          }
          process.stdout.write(delta.delta);
          file.write(delta.delta);
        } else if (delta?.type === "thinking_delta" && typeof delta.delta === "string") {
          file.write(delta.delta);
        }
        break;
      }
      case "message_end": {
        if (event.message?.role === "assistant") {
          if (assistantLineOpen) process.stdout.write("\n");
          assistantLineOpen = false;
          file.write("\n\n");
        }
        break;
      }
      case "tool_execution_start": {
        if (assistantLineOpen) {
          process.stdout.write("\n");
          assistantLineOpen = false;
        }
        const summary = summarizeToolArgs(event.toolName, event.args, config.verbose);
        console.log(`${prefix} ${color.gray("⚙")} ${color.bold(event.toolName)} ${color.dim(summary)}`);
        file.write(`> **tool:** \`${event.toolName}\` ${summary ? `— ${summary}` : ""}\n\n`);
        break;
      }
      case "tool_execution_end": {
        if (event.isError) {
          const details = resultPreview(event.result);
          console.log(`${prefix} ${color.red("✗")} ${event.toolName} ${color.red(oneLine(details, 200))}`);
          file.write(`> **error:** ${oneLine(details, 400)}\n\n`);
        }
        break;
      }
      case "auto_retry_start": {
        warn(role, `retry ${event.attempt}/${event.maxAttempts} in ${event.delayMs}ms — ${oneLine(event.errorMessage, 160)}`);
        break;
      }
      case "auto_retry_end": {
        if (!event.success) warn(role, "retries exhausted");
        break;
      }
      case "compaction_start": {
        log(role, `compacting context (${event.reason})…`);
        break;
      }
      default:
        break;
    }
  });

  return {
    session,
    dispose: async () => {
      unsubscribe();
      const usage = usageSummary(session);
      file.write(`\n---\n\nFinished: ${new Date().toISOString()}\n\nUsage: ${usage}\n`);
      await new Promise<void>((done) => file.end(done));
      try {
        session.dispose();
      } catch {
        // Session may already be aborted/disposed.
      }
    },
  };
}

function summarizeToolArgs(toolName: string, args: any, verbose: boolean): string {
  if (!args || typeof args !== "object") return "";
  if (verbose) return oneLine(JSON.stringify(args), 240);
  switch (toolName) {
    case "bash":
      return oneLine(String(args.command ?? ""), 160);
    case "read":
    case "write":
    case "edit":
    case "ls":
      return shortPath(String(args.path ?? args.paths ?? ""), 120);
    case "grep":
      return oneLine(`/${args.pattern ?? ""}/ ${args.path ?? ""}`, 120);
    case "find":
      return oneLine(`${args.pattern ?? args.glob ?? ""} ${args.path ?? ""}`, 120);
    case "write_audit_report":
      return oneLine(`[${args.severity}] ${args.title} (${args.slug})`, 160);
    case "submit_audit":
      return `score ${Object.values(args.categories ?? {}).join("/")}`;
    case "record_fix":
      return `${args.report}: ${args.status}`;
    case "submit_fixes":
      return oneLine(String(args.summary ?? ""), 120);
    case "run_readonly_command":
      return oneLine(String(args.command ?? ""), 160);
    default:
      return oneLine(JSON.stringify(args), 160);
  }
}

function resultPreview(result: any): string {
  const content = result?.content;
  if (Array.isArray(content)) {
    const text = content
      .map((item: any) => (item?.type === "text" ? item.text : ""))
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }
  return typeof result === "string" ? result : JSON.stringify(result ?? {});
}

export interface PromptResult {
  timedOut: boolean;
  /** True when the model returned no assistant message at all. */
  empty: boolean;
  error?: string;
}

/** Run one prompt turn with a wall-clock timeout. */
export async function runPrompt(
  session: AgentSession,
  role: AgentRole,
  prompt: string,
  timeoutMs: number,
): Promise<PromptResult> {
  let timedOut = false;
  const before = session.messages.length;
  const assistantBefore = session.messages.filter((message) => message.role === "assistant").length;
  const timer = setTimeout(() => {
    timedOut = true;
    warn(role, `wall-clock timeout after ${Math.round(timeoutMs / 60000)} min — aborting agent`);
    void session.abort();
  }, timeoutMs);

  try {
    await session.prompt(prompt);
    const newMessages = session.messages.slice(before) as any[];
    const assistantMessages = newMessages.filter((message) => message.role === "assistant");
    const assistantTotal = session.messages.filter((message) => message.role === "assistant").length;

    const failed = assistantMessages.find(
      (message) => message.stopReason === "error" || message.errorMessage,
    );
    if (failed) {
      return {
        timedOut,
        empty: assistantTotal === assistantBefore,
        error: failed.errorMessage ?? "model returned an error",
      };
    }

    return { timedOut, empty: assistantTotal === assistantBefore };
  } catch (err) {
    if (timedOut) return { timedOut: true, empty: false, error: "agent timed out" };
    return { timedOut: false, empty: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export interface ResolveModelsOptions {
  services: AgentSessionServices;
  config: LoopConfig;
}

function candidateFor(role: AgentRole, config: LoopConfig, services: AgentSessionServices) {
  const roleModel = role === "auditor" ? config.auditorModel : config.fixerModel;
  // Explicit CLI model wins. Environment defaults are only used when the user
  // did not pass a model, so a stray PI_PROVIDER cannot hijack `--model`.
  const cliText = roleModel ?? config.model;
  const envText = process.env.PI_MODEL;
  const text = cliText ?? envText;
  const provider = cliText ? config.provider : (config.provider ?? process.env.PI_PROVIDER);
  const fallbackProvider = services.settingsManager.getDefaultProvider();
  const fallbackModel = services.settingsManager.getDefaultModel();
  return { text, provider, cliText, envText, fallbackProvider, fallbackModel };
}

function modelCandidates(
  text: string,
  provider: string | undefined,
): Array<{ text: string; provider?: string }> {
  const candidates: Array<{ text: string; provider?: string }> = [];
  const add = (entry: { text: string; provider?: string }) => {
    if (!entry.text) return;
    if (candidates.some((item) => item.text === entry.text && item.provider === entry.provider)) return;
    candidates.push(entry);
  };

  // A provider-qualified reference is the most explicit signal.
  if (text.includes("/")) {
    const slash = text.indexOf("/");
    const prefix = text.slice(0, slash);
    const rest = text.slice(slash + 1);
    if (provider && provider === prefix) {
      add({ text: rest, provider });
    } else if (!provider) {
      add({ text: rest, provider: prefix });
      add({ text });
    } else {
      add({ text, provider });
      add({ text: rest, provider: prefix });
    }
  } else {
    if (provider) add({ text, provider });
    add({ text });
  }
  return candidates;
}

function tryResolve(
  services: AgentSessionServices,
  config: LoopConfig,
  role: AgentRole,
  available: any[],
): { model: any; thinkingLevel?: ThinkingLevel; warning?: string } | null {
  const { text, provider, fallbackProvider, fallbackModel } = candidateFor(role, config, services);
  const runtime = services.modelRuntime as any;

  const attempts: Array<{ text: string; provider?: string }> = [];
  if (text) attempts.push(...modelCandidates(text, provider));
  if (fallbackModel) attempts.push(...modelCandidates(fallbackModel, fallbackProvider));

  for (const attempt of attempts) {
    const resolved = resolveCliModel({
      cliProvider: attempt.provider,
      cliModel: attempt.text,
      cliThinking: config.thinking,
      modelRuntime: runtime,
    });
    if (!resolved.model) continue;

    // `resolveCliModel` will happily synthesize a custom model id when the
    // requested model is not in the provider's catalog. Reject those: a model
    // that does not exist produces empty agent runs and burns a whole pass.
    const providerId = resolved.model.provider;
    const modelId = resolved.model.id;
    const catalog = runtime.getModel(providerId, modelId);
    const availableModel = available.find(
      (model: any) => model.provider === providerId && model.id === modelId,
    );
    if (!catalog || !availableModel) continue;

    return {
      model: catalog,
      thinkingLevel: resolved.thinkingLevel,
      warning: resolved.warning,
    };
  }
  return null;
}

export async function resolveAgentModels(options: ResolveModelsOptions): Promise<{
  auditor: ResolvedAgentModel;
  fixer: ResolvedAgentModel;
}> {
  const { services, config } = options;
  const runtime = services.modelRuntime as any;
  const settings = services.settingsManager;

  const available = await runtime.getAvailable();
  if (available.length === 0) {
    throw new Error(
      "No models with valid credentials found. Run `pi` once to log in, or set PI_PROVIDER/PI_MODEL.",
    );
  }

  const defaultThinking: ThinkingLevel =
    config.thinking ?? settings.getDefaultThinkingLevel() ?? "high";

  const resolveRole = (role: AgentRole): ResolvedAgentModel => {
    const resolved = tryResolve(services, config, role, available);
    const requested = candidateFor(role, config, services);
    if (resolved?.model) {
      let warning = resolved.warning;
      if (requested.cliText) {
        const label = `${resolved.model.provider}/${resolved.model.id}`;
        const needle = requested.cliText.toLowerCase();
        const matches =
          label.toLowerCase().includes(needle) ||
          String(resolved.model.id).toLowerCase().includes(needle);
        if (!matches) {
          warning =
            `Requested model "${requested.cliText}" could not be resolved; using ${label} instead. ` +
            (warning ?? "");
        }
      }
      return {
        model: resolved.model,
        thinkingLevel: (resolved.thinkingLevel ?? defaultThinking) as ThinkingLevel,
        label: `${resolved.model.provider}/${resolved.model.id}`,
        warning: warning || undefined,
      };
    }

    // Last resort: first available model. This is deterministic and always has
    // working credentials.
    const fallback = available[0]!;
    const warning =
      `Could not resolve requested model` +
      (requested.text ? ` "${requested.text}"` : "") +
      (requested.provider ? ` for provider "${requested.provider}"` : "") +
      `. Falling back to ${fallback.provider}/${fallback.id}. ` +
      `Available examples: ${available
        .slice(0, 8)
        .map((model: any) => `${model.provider}/${model.id}`)
        .join(", ")}`;
    return {
      model: fallback,
      thinkingLevel: defaultThinking,
      label: `${fallback.provider}/${fallback.id}`,
      warning,
    };
  };

  return { auditor: resolveRole("auditor"), fixer: resolveRole("fixer") };
}
