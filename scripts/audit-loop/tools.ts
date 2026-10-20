/**
 * Custom tools exposed to the two agents.
 *
 * The auditor can only write through `write_audit_report` / `submit_audit` and
 * can only run read-only shell commands. The fixer reports progress through
 * `record_fix` / `submit_fixes`; its file edits are guarded in agent.ts.
 */

import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { runCommand } from "./git";
import {
  weightedScore,
  writeReport,
  type FixRecord,
  type ReportCategory,
  type ReportMeta,
  type ScoreCategory,
  type Severity,
} from "./state";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const REPORT_CATEGORIES: ReportCategory[] = [
  "architecture",
  "react",
  "tauri",
  "ux",
  "accessibility",
  "security",
  "performance",
  "correctness",
  "maintainability",
  "testing",
  "tooling",
];
const FIX_STATUSES = ["fixed", "partial", "skipped", "invalid"] as const;

const severitySchema = Type.Union(SEVERITIES.map((value) => Type.Literal(value)));
const reportCategorySchema = Type.Union(REPORT_CATEGORIES.map((value) => Type.Literal(value)));
const scoreSchema = Type.Integer({ minimum: 0, maximum: 100 });

function text(value: string, isError = false) {
  return {
    content: [{ type: "text" as const, text: value }],
    details: {},
    isError,
  };
}

export interface AuditorToolsOptions {
  auditDir: string;
  cwd: string;
  iteration: number;
  reports: ReportMeta[];
  onReport: (report: ReportMeta) => void;
  onSubmit: (categories: Record<ScoreCategory, number>, verdict: string) => void;
}

export function createAuditorTools(options: AuditorToolsOptions): ToolDefinition[] {
  const writeAuditReport = defineTool({
    name: "write_audit_report",
    label: "Write audit report",
    description:
      "Write one audit report to audit/iterations/<NNN>/. Use one report per root cause. Content must be full markdown with Evidence, Why it matters, Recommended fix, Acceptance criteria, and Verification sections.",
    promptSnippet: "Write one evidence-based audit report",
    parameters: Type.Object({
      slug: Type.String({
        description: "Stable kebab-case identifier, unique within this iteration (e.g. cart-rerender-storm).",
      }),
      title: Type.String({ description: "Short human-readable title." }),
      severity: severitySchema,
      category: reportCategorySchema,
      files: Type.Array(Type.String(), {
        description: "Affected file paths, relative to the repository root. Include at least one when possible.",
      }),
      summary: Type.String({
        description: "One tight paragraph: what is wrong and why it matters. Shown in the TOC.",
      }),
      content: Type.String({
        description:
          "Full markdown body. Must include: ## Evidence, ## Why it matters, ## Recommended fix, ## Acceptance criteria, ## Verification.",
      }),
    }),
    execute: async (_toolCallId, params) => {
      const report = await writeReport(
        options.auditDir,
        options.cwd,
        options.iteration,
        options.reports,
        {
          slug: params.slug,
          title: params.title,
          severity: params.severity,
          category: params.category,
          files: params.files,
          summary: params.summary,
          content: params.content,
        },
      );
      options.onReport(report);
      return text(
        `Wrote ${report.path}\n` +
          `Reports so far in iteration ${options.iteration}: ${options.reports.length}. ` +
          `Continue with the next finding, then call submit_audit.`,
      );
    },
    // Report filenames use an incrementing index; parallel calls would collide.
    executionMode: "sequential",
  });

  const submitAudit = defineTool({
    name: "submit_audit",
    label: "Submit audit",
    description:
      "Finish the audit. Provide honest 0-100 scores for all six areas and a short verdict. The harness computes the weighted overall score.",
    promptSnippet: "Submit the audit scores and verdict",
    parameters: Type.Object({
      categories: Type.Object({
        architecture: scoreSchema,
        react: scoreSchema,
        tauri: scoreSchema,
        ux: scoreSchema,
        codeQuality: scoreSchema,
        testing: scoreSchema,
      }),
      verdict: Type.String({
        description:
          "3-6 sentences: biggest remaining risk, what improved since the last audit, and what you deliberately did not cover.",
      }),
    }),
    execute: async (_toolCallId, params) => {
      const categories = params.categories as Record<ScoreCategory, number>;
      options.onSubmit(categories, params.verdict);
      const overall = weightedScore(categories);
      return text(
        `Audit submitted. Weighted overall score: ${overall}/100. ` +
          `Reports: ${options.reports.length}. The harness will now score the iteration.`,
      );
    },
  });

  const runReadonlyCommand = defineTool({
    name: "run_readonly_command",
    label: "Run read-only command",
    description:
      "Run a read-only shell command for inspection (git log/show/diff/status, rg, wc, find, ls, sed -n, ...). Mutating commands, redirection, and command chaining are rejected. Prefer read/grep/find/ls when possible.",
    promptSnippet: "Run a read-only inspection command",
    parameters: Type.Object({
      command: Type.String({ description: "The command to run, e.g. `git log --oneline -10`." }),
    }),
    execute: async (_toolCallId, params) => {
      const blocked = checkReadonlyCommand(params.command);
      if (blocked) {
        return text(`Blocked: ${blocked}\n\nUse read/grep/find/ls instead, or a plain read-only command.`, true);
      }
      const result = await runCommand(["bash", "-lc", params.command], options.cwd, {
        timeoutMs: 30_000,
      });
      const output = `${result.stdout}${result.stderr}`.trim();
      const capped = output.length > 40_000 ? `${output.slice(0, 40_000)}\n… (output truncated)` : output;
      return text(
        `exit ${result.code}\n${capped || "(no output)"}`,
        result.code !== 0,
      );
    },
  });

  return [writeAuditReport, submitAudit, runReadonlyCommand];
}

const READONLY_BLOCKERS: Array<{ re: RegExp; why: string }> = [
  { re: /[;&]/, why: "command chaining with ; or & is not allowed" },
  { re: /\|\|/, why: "command chaining with || is not allowed" },
  { re: /\$\(|`/, why: "command substitution is not allowed" },
  { re: /(^|[^0-9])>(?!&)/, why: "output redirection is not allowed" },
  { re: /\brm\b|\brmdir\b|\bmv\b|\bcp\b|\btouch\b|\bmkdir\b|\bln\b|\btruncate\b|\bdd\b/, why: "filesystem mutation is not allowed" },
  { re: /\bchmod\b|\bchown\b|\bsudo\b/, why: "permission changes are not allowed" },
  { re: /\btee\b/, why: "writing through tee is not allowed" },
  { re: /\bsed\s+(-[a-zA-Z]*i|--in-place)/, why: "in-place sed is not allowed" },
  { re: /\bperl\s+-[a-zA-Z]*i/, why: "in-place perl is not allowed" },
  { re: /\bawk\s+[^|]*-i\s+inplace/, why: "in-place awk is not allowed" },
  {
    re: /\bgit\s+(add|commit|push|pull|fetch|reset|checkout|switch|restore|clean|rm|mv|merge|rebase|stash|tag|apply|am|config|branch\s+-[dD])\b/,
    why: "mutating git commands are not allowed",
  },
  {
    re: /\b(npm|bun|pnpm|yarn)\s+(add|remove|install|uninstall|update|upgrade|link|unlink)\b/,
    why: "package installation is not allowed",
  },
  { re: /\bcargo\s+(add|remove|install|update)\b|\brustup\b/, why: "toolchain mutation is not allowed" },
  { re: /\bcurl\b|\bwget\b|\bnc\b|\bnetcat\b/, why: "network downloads are not allowed" },
  { re: /\bkill\b|\bpkill\b|\bkillall\b/, why: "process signalling is not allowed" },
  { re: /\b(node|bun|deno|python|python3|ruby|perl)\s+(-e|-c|--eval)\b/, why: "inline interpreter code is not allowed" },
  { re: /\bfind\b[^|]*-delete\b/, why: "find -delete is not allowed" },
];

export function checkReadonlyCommand(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return "empty command";
  if (trimmed.includes("\n")) return "multi-line commands are not allowed";
  for (const { re, why } of READONLY_BLOCKERS) {
    if (re.test(trimmed)) return why;
  }
  return null;
}

export interface FixerToolsOptions {
  reports: ReportMeta[];
  fixes: FixRecord[];
  onFix: (record: FixRecord) => void;
  onSubmit: (summary: string) => void;
}

export function createFixerTools(options: FixerToolsOptions): ToolDefinition[] {
  const recordFix = defineTool({
    name: "record_fix",
    label: "Record fix",
    description:
      "Record the outcome for one audit report. Call this once per report after you have fixed it, partially fixed it, skipped it, or found it invalid.",
    promptSnippet: "Record the outcome for an audit report",
    parameters: Type.Object({
      report: Type.String({ description: "Report slug from audit/toc.md." }),
      status: Type.Union(FIX_STATUSES.map((value) => Type.Literal(value))),
      note: Type.String({
        description: "Concrete note: what changed, what remains, or why it was skipped/invalid.",
      }),
    }),
    execute: async (_toolCallId, params) => {
      const known = options.reports.some((report) => report.slug === params.report);
      if (!known) {
        const slugs = options.reports.map((report) => report.slug).join(", ") || "(none)";
        return text(
          `Unknown report slug "${params.report}". Use one of: ${slugs}. ` +
            `If the finding is not in the current iteration, do not record it.`,
          true,
        );
      }
      const record: FixRecord = {
        report: params.report,
        status: params.status,
        note: params.note.trim(),
      };
      const index = options.fixes.findIndex((entry) => entry.report === record.report);
      if (index >= 0) options.fixes[index] = record;
      else options.fixes.push(record);
      options.onFix(record);
      return text(
        `Recorded ${record.status} for ${record.report}. ` +
          `Progress: ${options.fixes.length}/${options.reports.length} reports recorded.`,
      );
    },
    executionMode: "sequential",
  });

  const submitFixes = defineTool({
    name: "submit_fixes",
    label: "Submit fixes",
    description:
      "Finish the fix pass. Provide a short summary of what changed, what remains, and anything the next auditor should know.",
    promptSnippet: "Submit the fix pass summary",
    parameters: Type.Object({
      summary: Type.String({ description: "Markdown summary of this fix pass." }),
    }),
    execute: async (_toolCallId, params) => {
      const unrecorded = options.reports.filter(
        (report) => !options.fixes.some((entry) => entry.report === report.slug),
      );
      options.onSubmit(params.summary.trim());
      const warning = unrecorded.length
        ? `\nWarning: no record_fix was recorded for: ${unrecorded.map((report) => report.slug).join(", ")}. ` +
          `The harness will treat those as pending.`
        : "";
      return text(`Fixes submitted. Recorded ${options.fixes.length}/${options.reports.length} reports.${warning}`);
    },
  });

  return [recordFix, submitFixes];
}
