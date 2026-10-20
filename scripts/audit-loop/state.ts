/**
 * Persistent state and report/TOC rendering for the audit loop.
 *
 * Everything the loop needs to resume lives in `audit/state.json`. Reports are
 * plain markdown files under `audit/iterations/<NNN>/`, and `audit/toc.md` is
 * always regenerated from state so it can never drift.
 */

import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export type Severity = "critical" | "high" | "medium" | "low";

export type ReportCategory =
  | "architecture"
  | "react"
  | "tauri"
  | "ux"
  | "accessibility"
  | "security"
  | "performance"
  | "correctness"
  | "maintainability"
  | "testing"
  | "tooling";

export type ScoreCategory = "architecture" | "react" | "tauri" | "ux" | "codeQuality" | "testing";

export type FixStatus = "fixed" | "partial" | "skipped" | "invalid";

export type StopReason =
  | "target"
  | "converged"
  | "max-iterations"
  | "no-progress"
  | "dry-run"
  | "interrupted"
  | "verification-failed"
  | "error";

export interface ReportMeta {
  slug: string;
  title: string;
  severity: Severity;
  category: ReportCategory;
  files: string[];
  summary: string;
  /** Path relative to the audit directory. */
  path: string;
  createdAt: string;
}

export interface AuditResult {
  score: number;
  categories: Record<ScoreCategory, number>;
  verdict: string;
  reports: ReportMeta[];
  at: string;
}

export interface FixRecord {
  report: string;
  status: FixStatus;
  note: string;
}

export interface VerificationResult {
  command: string;
  ok: boolean;
  exitCode: number;
  output: string;
  at: string;
}

export interface FixResult {
  summary: string;
  fixes: FixRecord[];
  at: string;
  verification?: VerificationResult;
}

export interface Iteration {
  iteration: number;
  startedAt: string;
  finishedAt?: string;
  audit?: AuditResult;
  fix?: FixResult;
}

export interface AuditState {
  version: 1;
  createdAt: string;
  updatedAt: string;
  config: {
    targetScore: number;
    convergeWindow: number;
    convergeEpsilon: number;
    maxIterations: number;
    model: string | undefined;
  };
  iterations: Iteration[];
  finished?: {
    reason: StopReason;
    at: string;
    score?: number;
    detail?: string;
  };
}

export const SCORE_WEIGHTS: Record<ScoreCategory, number> = {
  architecture: 15,
  react: 25,
  tauri: 15,
  ux: 20,
  codeQuality: 15,
  testing: 10,
};

export const SCORE_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  architecture: "Architecture & project structure",
  react: "React correctness & performance",
  tauri: "Tauri / Rust / desktop security",
  ux: "UI/UX & accessibility",
  codeQuality: "Code quality & maintainability",
  testing: "Testing & tooling",
};

export function weightedScore(categories: Record<ScoreCategory, number>): number {
  let total = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS) as Array<[ScoreCategory, number]>) {
    total += (categories[key] ?? 0) * (weight / 100);
  }
  return Math.round(Math.max(0, Math.min(100, total)));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function iterationDir(auditDir: string, iteration: number): string {
  return join(auditDir, "iterations", String(iteration).padStart(3, "0"));
}

export function statePath(auditDir: string): string {
  return join(auditDir, "state.json");
}

export function tocPath(auditDir: string): string {
  return join(auditDir, "toc.md");
}

export async function loadState(auditDir: string): Promise<AuditState | null> {
  try {
    const raw = await readFile(statePath(auditDir), "utf8");
    const parsed = JSON.parse(raw) as AuditState;
    if (parsed.version !== 1) throw new Error(`Unsupported state version: ${String(parsed.version)}`);
    if (!Array.isArray(parsed.iterations)) throw new Error("state.json has no iterations array");
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export function createState(config: {
  targetScore: number;
  convergeWindow: number;
  convergeEpsilon: number;
  maxIterations: number;
  model: string | undefined;
}): AuditState {
  const at = nowIso();
  return {
    version: 1,
    createdAt: at,
    updatedAt: at,
    config,
    iterations: [],
  };
}

export async function saveState(auditDir: string, state: AuditState): Promise<void> {
  state.updatedAt = nowIso();
  await mkdir(auditDir, { recursive: true });
  const path = statePath(auditDir);
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

export interface NewReportInput {
  slug: string;
  title: string;
  severity: Severity;
  category: ReportCategory;
  files: string[];
  summary: string;
  content: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function reportFileName(index: number, slug: string): string {
  const safe = slugify(slug) || "report";
  return `report-${String(index).padStart(2, "0")}-${safe}.md`;
}

// Custom tool calls can arrive in parallel. Serialize report writes so two
// reports never pick the same numeric filename prefix.
let reportWriteQueue: Promise<unknown> = Promise.resolve();

export function writeReport(
  auditDir: string,
  cwd: string,
  iteration: number,
  reportsSoFar: ReportMeta[],
  input: NewReportInput,
): Promise<ReportMeta> {
  const task = reportWriteQueue.then(() =>
    writeReportNow(auditDir, cwd, iteration, reportsSoFar, input),
  );
  reportWriteQueue = task.catch(() => undefined);
  return task;
}

async function writeReportNow(
  auditDir: string,
  cwd: string,
  iteration: number,
  reportsSoFar: ReportMeta[],
  input: NewReportInput,
): Promise<ReportMeta> {
  const dir = iterationDir(auditDir, iteration);
  await mkdir(dir, { recursive: true });

  const safeSlug = slugify(input.slug) || `report-${reportsSoFar.length + 1}`;
  const existing = reportsSoFar.find((report) => report.slug === safeSlug);
  let index: number;
  if (existing) {
    index = Number(existing.path.match(/report-(\d+)-/)?.[1] ?? reportsSoFar.length + 1);
  } else {
    const existingFiles = await readdir(dir).catch(() => [] as string[]);
    const maxOnDisk = existingFiles.reduce((max, name) => {
      const match = name.match(/^report-(\d+)-/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    index = Math.max(reportsSoFar.length, maxOnDisk) + 1;
  }
  const fileName = reportFileName(index, safeSlug);
  const absolute = join(dir, fileName);
  const relativePath = relative(auditDir, absolute);
  const createdAt = nowIso();

  const files = (input.files ?? []).map((file) => file.trim()).filter(Boolean);
  const frontmatter = [
    "---",
    `slug: ${safeSlug}`,
    `title: ${JSON.stringify(input.title)}`,
    `severity: ${input.severity}`,
    `category: ${input.category}`,
    `iteration: ${iteration}`,
    `created: ${createdAt}`,
    "files:",
    ...(files.length ? files.map((file) => `  - ${JSON.stringify(file)}`) : ["  - \"(not specified)\""]),
    "---",
    "",
  ].join("\n");

  const body = [
    frontmatter,
    `# ${input.title}`,
    "",
    `- **Severity:** ${input.severity}`,
    `- **Category:** ${input.category}`,
    `- **Files:** ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "_(not specified)_"}`,
    `- **Iteration:** ${iteration}`,
    "",
    "## Summary",
    "",
    input.summary.trim(),
    "",
    "## Details",
    "",
    input.content.trim(),
    "",
  ].join("\n");

  await writeFile(absolute, body, "utf8");

  const meta: ReportMeta = {
    slug: safeSlug,
    title: input.title,
    severity: input.severity,
    category: input.category,
    files: files.map((file) => file.replace(resolve(cwd), "").replace(/^\/+/, "")),
    summary: input.summary.trim(),
    path: relativePath,
    createdAt,
  };

  const existingIndex = reportsSoFar.findIndex((report) => report.slug === safeSlug);
  if (existingIndex >= 0) reportsSoFar[existingIndex] = meta;
  else reportsSoFar.push(meta);
  return meta;
}

function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function scoreDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return "—";
  const delta = current - previous;
  if (delta === 0) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function statusFor(report: ReportMeta, iteration: Iteration | undefined): string {
  const record = iteration?.fix?.fixes.find((fix) => fix.report === report.slug);
  return record ? record.status : "pending";
}

function sortedReports(iteration: Iteration | undefined): ReportMeta[] {
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...(iteration?.audit?.reports ?? [])].sort(
    (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || a.title.localeCompare(b.title),
  );
}

export function renderToc(state: AuditState): string {
  const withAudit = state.iterations.filter((iteration) => iteration.audit);
  const latest = withAudit.at(-1);
  const previousAudit = withAudit.at(-2);
  const latestAudit = latest?.audit;
  const score = latestAudit?.score;

  const lines: string[] = [];
  lines.push("# Codebase Audit — Table of Contents");
  lines.push("");
  lines.push("> Generated by `bun run audit:loop`. Do not edit by hand.");
  lines.push(`> Last updated: ${formatDate(state.updatedAt)}`);
  lines.push("");

  if (score !== undefined && latestAudit) {
    lines.push(`## Overall score: **${score} / 100**`);
    lines.push("");
    lines.push(
      `Iteration **${latest!.iteration}** · target **${state.config.targetScore}** · ` +
        `change **${scoreDelta(score, previousAudit?.audit?.score)}** · audited ${formatDate(latestAudit.at)}`,
    );
    lines.push("");
    lines.push(`**Verdict:** ${latestAudit.verdict.trim()}`);
    lines.push("");
    lines.push("| Area | Score | Weight |");
    lines.push("| --- | ---: | ---: |");
    for (const key of Object.keys(SCORE_WEIGHTS) as ScoreCategory[]) {
      lines.push(
        `| ${SCORE_CATEGORY_LABELS[key]} | ${latestAudit.categories[key] ?? 0}/100 | ${SCORE_WEIGHTS[key]}% |`,
      );
    }
    lines.push("");
  } else {
    lines.push("## Overall score: **— / 100**");
    lines.push("");
    lines.push("_No completed audit yet._");
    lines.push("");
  }

  if (state.finished) {
    lines.push(
      `> **Loop finished:** ${state.finished.reason}` +
        (state.finished.score !== undefined ? ` at score ${state.finished.score}` : "") +
        ` · ${formatDate(state.finished.at)}`,
    );
    if (state.finished.detail) lines.push(`> ${state.finished.detail}`);
    lines.push("");
  }

  if (withAudit.length > 0) {
    lines.push("## Score history");
    lines.push("");
    lines.push("| Iter | Score | Δ | Reports | Fixes | Verdict |");
    lines.push("| ---: | ---: | ---: | ---: | --- | --- |");
    let previous: number | undefined;
    for (const iteration of withAudit) {
      const audit = iteration.audit!;
      const fixes = iteration.fix
        ? iteration.fix.fixes.reduce(
            (acc, fix) => {
              acc[fix.status] = (acc[fix.status] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          )
        : undefined;
      const fixSummary = fixes
        ? Object.entries(fixes)
            .map(([status, count]) => `${status}:${count}`)
            .join(" ")
        : "—";
      lines.push(
        `| ${iteration.iteration} | ${audit.score} | ${scoreDelta(audit.score, previous)} | ` +
          `${audit.reports.length} | ${fixSummary} | ${mdCell(audit.verdict).slice(0, 80)} |`,
      );
      previous = audit.score;
    }
    lines.push("");
  }

  if (latest && latestAudit) {
    lines.push(`## Current reports — iteration ${latest.iteration}`);
    lines.push("");
    if (latestAudit.reports.length === 0) {
      lines.push("_The auditor filed no reports._");
      lines.push("");
    } else {
      lines.push("| # | Report | Severity | Category | Status | Files |");
      lines.push("| ---: | --- | --- | --- | --- | --- |");
      sortedReports(latest).forEach((report, index) => {
        const files = report.files.length ? report.files.map((file) => `\`${file}\``).join("<br>") : "—";
        lines.push(
          `| ${index + 1} | [${mdCell(report.title)}](./${report.path}) | ${report.severity} | ` +
            `${report.category} | ${statusFor(report, latest)} | ${mdCell(files)} |`,
        );
      });
      lines.push("");
      for (const report of sortedReports(latest)) {
        lines.push(`### ${report.title}`);
        lines.push("");
        lines.push(`- **Slug:** \`${report.slug}\``);
        lines.push(`- **Severity:** ${report.severity}`);
        lines.push(`- **Category:** ${report.category}`);
        lines.push(`- **Status:** ${statusFor(report, latest)}`);
        lines.push(`- **Report:** [${report.path}](./${report.path})`);
        lines.push(`- **Files:** ${report.files.length ? report.files.map((file) => `\`${file}\``).join(", ") : "—"}`);
        lines.push("");
        lines.push(report.summary);
        lines.push("");
      }
    }
  }

  const earlier = withAudit.slice(0, -1).reverse();
  if (earlier.length > 0) {
    lines.push("## Previous iterations");
    lines.push("");
    for (const iteration of earlier) {
      const audit = iteration.audit!;
      lines.push(`<details>`);
      lines.push(`<summary>Iteration ${iteration.iteration} — score ${audit.score}, ${audit.reports.length} report(s)</summary>`);
      lines.push("");
      lines.push(audit.verdict.trim());
      lines.push("");
      if (audit.reports.length === 0) {
        lines.push("_No reports._");
      } else {
        for (const report of sortedReports(iteration)) {
          lines.push(
            `- [${report.title}](./${report.path}) — **${report.severity}** / ${report.category} / ` +
              `fix: ${statusFor(report, iteration)}`,
          );
        }
      }
      lines.push("");
      lines.push(`</details>`);
      lines.push("");
    }
  }

  if (state.iterations.length === 0) {
    lines.push("## Current reports");
    lines.push("");
    lines.push("_Waiting for the first audit._");
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeToc(auditDir: string, state: AuditState): Promise<void> {
  await mkdir(auditDir, { recursive: true });
  const path = tocPath(auditDir);
  const tmp = `${path}.tmp`;
  await writeFile(tmp, renderToc(state), "utf8");
  await rename(tmp, path);
}

export interface ConvergenceResult {
  converged: boolean;
  reason: string;
  scores: number[];
}

export function checkConvergence(
  state: AuditState,
  window: number,
  epsilon: number,
): ConvergenceResult {
  const scores = state.iterations
    .map((iteration) => iteration.audit?.score)
    .filter((score): score is number => typeof score === "number");
  if (scores.length < window) {
    return { converged: false, reason: `only ${scores.length}/${window} scores so far`, scores };
  }
  const recent = scores.slice(-window);
  const spread = Math.max(...recent) - Math.min(...recent);
  return {
    converged: spread <= epsilon,
    reason: `last ${window} scores: ${recent.join(", ")} (spread ${spread}, epsilon ${epsilon})`,
    scores: recent,
  };
}

/** Path inside `audit/` for an iteration log. Logs are git-ignored. */
export function agentLogPath(auditDir: string, iteration: number, role: "auditor" | "fixer"): string {
  return join(auditDir, "logs", `iteration-${String(iteration).padStart(3, "0")}-${role}.log.md`);
}

export async function ensureDirForFile(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}
