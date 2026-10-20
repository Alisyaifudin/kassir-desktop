/**
 * Orchestrator: auditor → fixer → verify → commit → repeat.
 */

import { mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { createAgentSessionServices, getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  resolveAgentModels,
  runPrompt,
  startAgent,
  type AgentHandle,
  type ResolvedAgentModel,
} from "./agent";
import { parseArgv, type LoopConfig } from "./config";
import {
  commitAll,
  isGitRepo,
  lastCommits,
  runCommand,
  statusPorcelain,
} from "./git";
import {
  buildAuditorNudge,
  buildAuditorPrompt,
  buildFixerNudge,
  buildFixerPrompt,
  buildFixRepairPrompt,
  fixerSystemPrompt,
  auditorSystemPrompt,
  summaryForCommit,
} from "./prompts";
import {
  agentLogPath,
  checkConvergence,
  createState,
  loadState,
  nowIso,
  saveState,
  weightedScore,
  writeToc,
  type AuditState,
  type FixRecord,
  type Iteration,
  type ReportMeta,
  type ScoreCategory,
  type StopReason,
  type VerificationResult,
} from "./state";
import { createAuditorTools, createFixerTools } from "./tools";
import { banner, color, error, log, section, warn } from "./ui";

const AUDITOR_TOOLS = [
  "read",
  "grep",
  "find",
  "ls",
  "write_audit_report",
  "submit_audit",
  "run_readonly_command",
];
const FIXER_TOOLS = [
  "read",
  "grep",
  "find",
  "ls",
  "edit",
  "write",
  "bash",
  "record_fix",
  "submit_fixes",
];

interface RuntimeContext {
  config: LoopConfig;
  state: AuditState;
  services: Awaited<ReturnType<typeof createAgentSessionServices>>;
  auditorModel: ResolvedAgentModel;
  fixerModel: ResolvedAgentModel;
  baselineVerify: VerificationResult | null;
  activeHandle: AgentHandle | null;
  interrupted: boolean;
  /** Outcome of the most recent fix-pass commit, used for no-progress detection. */
  lastCommit?: { ok: boolean; hash?: string; reason?: string };
}

export async function main(argv: string[]): Promise<number> {
  let config: LoopConfig;
  try {
    config = parseArgv(argv);
  } catch (err) {
    error("args", err instanceof Error ? err.message : String(err));
    return 2;
  }

  try {
    await runLoop(config);
    return 0;
  } catch (err) {
    if (isInterruptedError(err)) return 130;
    error("loop", err instanceof Error ? (err.stack ?? err.message) : String(err));
    return 1;
  }
}

function isInterruptedError(err: unknown): boolean {
  return err instanceof Error && err.message === "INTERRUPTED";
}

async function runLoop(config: LoopConfig): Promise<void> {
  const cwd = config.cwd;
  config.auditDir = join(cwd, config.auditDir);

  if (!(await isGitRepo(cwd))) {
    throw new Error(`${cwd} is not a git repository. The loop needs git commits.`);
  }

  const dirty = await statusPorcelain(cwd);
  const auditRelative = relative(cwd, config.auditDir);
  // Harness-owned files (state, TOC, reports, logs) must never block a resume.
  // Only uncommitted work outside the audit directory is dangerous here.
  const relevantDirty = dirty.filter((line) => {
    if (!auditRelative || auditRelative.startsWith("..")) return true;
    const path = line.slice(3).trim().replace(/^"|"$/g, "");
    return !(path === auditRelative || path.startsWith(`${auditRelative}/`));
  });
  if (relevantDirty.length > 0 && !config.allowDirty) {
    if (config.dryRun) {
      warn(
        "git",
        `dry run on a dirty tree (${relevantDirty.length} path(s)); no fixes or commits will be made`,
      );
    } else {
      const preview = relevantDirty.slice(0, 20).map((line) => `  ${line}`).join("\n");
      throw new Error(
        `Working tree has uncommitted changes:\n${preview}\n\n` +
          `Commit or stash them first, or pass --allow-dirty. The fixer's commit would otherwise sweep them in.`,
      );
    }
  }
  if (relevantDirty.length > 0) {
    warn("git", `starting with ${relevantDirty.length} uncommitted path(s) because --allow-dirty was passed`);
  }

  await mkdir(config.auditDir, { recursive: true });
  await mkdir(join(config.auditDir, "logs"), { recursive: true });

  let state = await loadState(config.auditDir);
  if (!state) {
    state = createState({
      targetScore: config.targetScore,
      convergeWindow: config.convergeWindow,
      convergeEpsilon: config.convergeEpsilon,
      maxIterations: config.maxIterations,
      model: config.model,
    });
    log("state", "created new audit state");
  } else {
    log(
      "state",
      `resuming: ${state.iterations.length} iteration(s), ` +
        `${state.iterations.filter((iteration) => iteration.audit).length} audit(s)`,
    );
  }

  if (state.finished && !config.force) {
    console.log();
    log("state", `previous run finished: ${state.finished.reason} (use --force to continue)`);
    if (state.finished.detail) log("state", state.finished.detail);
    await writeToc(config.auditDir, state);
    return;
  }
  if (state.finished && config.force) {
    warn("state", `ignoring previous finished marker (${state.finished.reason}) because --force was passed`);
    state.finished = undefined;
  }

  state.config = {
    targetScore: config.targetScore,
    convergeWindow: config.convergeWindow,
    convergeEpsilon: config.convergeEpsilon,
    maxIterations: config.maxIterations,
    model: config.model,
  };
  await saveState(config.auditDir, state);

  const services = await createAgentSessionServices({
    cwd,
    agentDir: getAgentDir(),
  });
  for (const diagnostic of services.diagnostics) {
    if (diagnostic.type === "error") error("pi", diagnostic.message);
    else if (diagnostic.type === "warning") warn("pi", diagnostic.message);
  }

  const models = await resolveAgentModels({ services, config });
  if (models.auditor.warning) warn("model", models.auditor.warning);
  if (models.fixer.warning) warn("model", models.fixer.warning);

  const ctx: RuntimeContext = {
    config,
    state,
    services,
    auditorModel: models.auditor,
    fixerModel: models.fixer,
    baselineVerify: null,
    activeHandle: null,
    interrupted: false,
  };

  process.on("SIGINT", () => onSignal(ctx, "SIGINT"));
  process.on("SIGTERM", () => onSignal(ctx, "SIGTERM"));

  printBanner(ctx);

  if (config.verifyCommand) {
    section("Baseline verification");
    log("verify", `running: ${config.verifyCommand}`);
    ctx.baselineVerify = await runVerification(config, config.verifyCommand);
    if (ctx.baselineVerify.ok) {
      log("verify", color.green("baseline passed"));
    } else {
      warn(
        "verify",
        `baseline failed (exit ${ctx.baselineVerify.exitCode}). ` +
          `The post-fix gate will run for information but will not block commits.`,
      );
    }
  }

  // Resume an unfinished fix pass from a previous run.
  const last = state.iterations.at(-1);
  if (!config.dryRun && last?.audit && !last.fix) {
    section(`Resuming fix pass for iteration ${last.iteration}`);
    await runFixPhase(ctx, last);
    if (ctx.interrupted) return finishInterrupted(ctx);
    if (state.finished) return;
    const converged = maybeFinishAfterFix(ctx);
    if (converged) return;
  }

  while (true) {
    if (ctx.interrupted) return finishInterrupted(ctx);

    const auditsDone = state.iterations.filter((iteration) => iteration.audit).length;
    if (auditsDone >= config.maxIterations) {
      await finish(ctx, "max-iterations", `completed ${auditsDone} audit(s)`);
      return;
    }

    const iterationNumber = (state.iterations.at(-1)?.iteration ?? 0) + 1;
    const iteration: Iteration = { iteration: iterationNumber, startedAt: nowIso() };
    state.iterations.push(iteration);
    await saveState(config.auditDir, state);

    section(`Iteration ${iterationNumber}: audit`);
    const audit = await runAuditPhase(ctx, iteration);
    if (ctx.interrupted) return finishInterrupted(ctx);
    if (audit.score >= config.targetScore) {
      await finish(
        ctx,
        "target",
        `auditor score ${audit.score} >= target ${config.targetScore}`,
      );
      return;
    }

    const convergence = checkConvergence(state, config.convergeWindow, config.convergeEpsilon);
    if (convergence.converged) {
      await finish(ctx, "converged", convergence.reason);
      return;
    }

    if (config.dryRun) {
      log("dry-run", `stopping after the audit (score ${audit.score}/100)`);
      await saveState(config.auditDir, state);
      await writeToc(config.auditDir, state);
      return;
    }

    if (audit.reports.length === 0) {
      await finish(ctx, "no-progress", "the auditor filed no reports, so the fixer has nothing to do");
      return;
    }

    section(`Iteration ${iterationNumber}: fix`);
    await runFixPhase(ctx, iteration);
    if (ctx.interrupted) return finishInterrupted(ctx);
    if (state.finished) return;

    const stopped = maybeFinishAfterFix(ctx);
    if (stopped) return;
  }
}

function onSignal(ctx: RuntimeContext, signal: string): void {
  if (ctx.interrupted) {
    warn("signal", `${signal} again — forcing exit`);
    void ctx.activeHandle?.session.abort();
    process.exit(130);
  }
  ctx.interrupted = true;
  warn("signal", `${signal} received — aborting the current agent after this step`);
  void ctx.activeHandle?.session.abort();
}

async function finishInterrupted(ctx: RuntimeContext): Promise<void> {
  ctx.state.updatedAt = nowIso();
  await saveState(ctx.config.auditDir, ctx.state);
  await writeToc(ctx.config.auditDir, ctx.state);
  log("loop", "interrupted — state saved. Re-run to resume; pass --allow-dirty if the fixer left edits.");
}

function printBanner(ctx: RuntimeContext): void {
  const { config, state } = ctx;
  banner([
    color.bold("Kassir audit loop"),
    `repo        ${config.cwd}`,
    `audit dir   ${config.auditDir}`,
    `auditor     ${ctx.auditorModel.label} (thinking: ${ctx.auditorModel.thinkingLevel})`,
    `fixer       ${ctx.fixerModel.label} (thinking: ${ctx.fixerModel.thinkingLevel})`,
    `stop        score >= ${config.targetScore}, or spread <= ${config.convergeEpsilon} over ${config.convergeWindow} runs`,
    `limits      ${config.maxIterations} audit(s), ${config.agentTimeoutMinutes} min/agent`,
    `verify      ${config.verifyCommand ?? "(disabled)"}`,
    `mode        ${config.dryRun ? "DRY RUN (audit only)" : "full loop"}`,
    `history     ${state.iterations.filter((iteration) => iteration.audit).length} audit(s), ` +
      `${state.iterations.filter((iteration) => iteration.fix).length} fix pass(es)`,
  ]);
}

async function runAuditPhase(ctx: RuntimeContext, iteration: Iteration): Promise<NonNullable<Iteration["audit"]>> {
  const { config, state } = ctx;
  const reports: ReportMeta[] = [];
  let submission: { categories: Record<ScoreCategory, number>; verdict: string } | undefined;

  const tools = createAuditorTools({
    auditDir: config.auditDir,
    cwd: config.cwd,
    iteration: iteration.iteration,
    reports,
    onReport: (report) => {
      log("auditor", `report ${color.bold(report.slug)} [${report.severity}] — ${report.title}`);
    },
    onSubmit: (categories, verdict) => {
      submission = { categories, verdict };
    },
  });

  const logPath = agentLogPath(config.auditDir, iteration.iteration, "auditor");
  const started = Date.now();
  const handle = await startAgent({
    role: "auditor",
    config,
    modelRuntime: ctx.services.modelRuntime,
    settingsManager: ctx.services.settingsManager,
    agentDir: getAgentDir(),
    model: ctx.auditorModel.model,
    thinkingLevel: ctx.auditorModel.thinkingLevel,
    systemPrompt: auditorSystemPrompt(config.cwd),
    tools: AUDITOR_TOOLS,
    customTools: tools,
    iteration: iteration.iteration,
    logPath,
  });
  ctx.activeHandle = handle;

  try {
    const prompt = buildAuditorPrompt({
      state,
      iteration: iteration.iteration,
      cwd: config.cwd,
      lastCommits: await lastCommits(config.cwd),
      targetScore: config.targetScore,
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      const currentPrompt = attempt === 1 ? prompt : buildAuditorNudge(attempt - 1);
      const result = await runPrompt(
        handle.session,
        "auditor",
        currentPrompt,
        config.agentTimeoutMinutes * 60_000,
      );
      if (ctx.interrupted) throw new Error("INTERRUPTED");
      if (result.timedOut) throw new Error("auditor timed out");
      if (result.empty) {
        throw new Error(
          "auditor produced no output at all. The selected model/provider is probably invalid or unreachable. " +
            `Model: ${ctx.auditorModel.label}. Log: ${logPath}`,
        );
      }
      if (result.error) {
        throw new Error(`auditor model error: ${result.error} (model: ${ctx.auditorModel.label})`);
      }
      if (submission) break;
      if (attempt === 3) {
        throw new Error(
          "auditor never called submit_audit after 3 prompts. " +
            `Reports written: ${reports.length}. Log: ${logPath}`,
        );
      }
      warn("auditor", `no submit_audit yet (attempt ${attempt}) — nudging`);
    }
  } finally {
    ctx.activeHandle = null;
    await handle.dispose();
  }

  if (!submission) {
    throw new Error("auditor produced no submission");
  }

  const score = weightedScore(submission.categories);
  const audit = {
    score,
    categories: submission.categories,
    verdict: submission.verdict.trim(),
    reports: [...reports],
    at: nowIso(),
  };

  iteration.audit = audit;
  iteration.finishedAt = undefined;
  await saveState(config.auditDir, state);
  await writeToc(config.auditDir, state);

  const elapsed = Math.round((Date.now() - started) / 1000);
  log(
    "auditor",
    `done in ${elapsed}s — ${color.bold(`score ${score}/100`)} with ${reports.length} report(s)`,
  );
  return audit;
}

async function runFixPhase(ctx: RuntimeContext, iteration: Iteration): Promise<void> {
  const { config, state } = ctx;
  const audit = iteration.audit;
  if (!audit) throw new Error(`iteration ${iteration.iteration} has no audit to fix`);

  const fixes: FixRecord[] = [];
  let summary: string | undefined;

  const tools = createFixerTools({
    reports: audit.reports,
    fixes,
    onFix: (record) => {
      log("fixer", `${record.status} ${color.bold(record.report)}`);
    },
    onSubmit: (value) => {
      summary = value;
    },
  });

  const logPath = agentLogPath(config.auditDir, iteration.iteration, "fixer");
  const started = Date.now();
  const handle = await startAgent({
    role: "fixer",
    config,
    modelRuntime: ctx.services.modelRuntime,
    settingsManager: ctx.services.settingsManager,
    agentDir: getAgentDir(),
    model: ctx.fixerModel.model,
    thinkingLevel: ctx.fixerModel.thinkingLevel,
    systemPrompt: fixerSystemPrompt(config.cwd, config.verifyCommand),
    tools: FIXER_TOOLS,
    customTools: tools,
    iteration: iteration.iteration,
    logPath,
  });
  ctx.activeHandle = handle;

  try {
    const prompt = buildFixerPrompt({
      iteration: iteration.iteration,
      cwd: config.cwd,
      reports: audit.reports,
      score: audit.score,
      verifyCommand: config.verifyCommand,
      verifyBaselineOk: ctx.baselineVerify?.ok ?? true,
      lastCommits: await lastCommits(config.cwd),
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      const currentPrompt = attempt === 1 ? prompt : buildFixerNudge(attempt - 1);
      const result = await runPrompt(
        handle.session,
        "fixer",
        currentPrompt,
        config.agentTimeoutMinutes * 60_000,
      );
      if (ctx.interrupted) throw new Error("INTERRUPTED");
      if (result.timedOut) throw new Error("fixer timed out");
      if (result.empty) {
        throw new Error(
          "fixer produced no output at all. The selected model/provider is probably invalid or unreachable. " +
            `Model: ${ctx.fixerModel.label}. Log: ${logPath}`,
        );
      }
      if (result.error) {
        throw new Error(`fixer model error: ${result.error} (model: ${ctx.fixerModel.label})`);
      }
      if (summary) break;
      if (attempt === 3) {
        throw new Error(
          "fixer never called submit_fixes after 3 prompts. " +
            `Recorded fixes: ${fixes.length}/${audit.reports.length}. Log: ${logPath}`,
        );
      }
      warn("fixer", `no submit_fixes yet (attempt ${attempt}) — nudging`);
    }

    let verification: VerificationResult | null = null;
    if (config.verifyCommand) {
      verification = await runVerification(config, config.verifyCommand);
      const enforced = ctx.baselineVerify?.ok === true;
      let repairs = 0;
      while (!verification.ok && enforced && repairs < 2 && !ctx.interrupted) {
        repairs++;
        warn("verify", `${config.verifyCommand} failed (repair ${repairs}/2) — sending output back to the fixer`);
        summary = undefined;
        const repair = await runPrompt(
          handle.session,
          "fixer",
          buildFixRepairPrompt(verification.output, repairs),
          config.agentTimeoutMinutes * 60_000,
        );
        if (ctx.interrupted) throw new Error("INTERRUPTED");
        if (repair.timedOut) throw new Error("fixer timed out during verification repair");
        if (repair.empty) throw new Error("fixer produced no output during verification repair");
        if (repair.error) throw new Error(`fixer model error during repair: ${repair.error}`);
        if (!summary) {
          warn("fixer", "fixer did not call submit_fixes after repair — nudging");
          const nudge = await runPrompt(handle.session, "fixer", buildFixerNudge(1), 5 * 60_000);
          if (nudge.empty) throw new Error("fixer produced no output while nudging after repair");
          if (nudge.error) throw new Error(`fixer model error while nudging: ${nudge.error}`);
        }
        verification = await runVerification(config, config.verifyCommand);
      }

      // If the tree is green now, enforce the gate for subsequent iterations
      // even when the run started with a failing baseline.
      if (verification.ok) ctx.baselineVerify = verification;

      if (!verification.ok && enforced) {
        iteration.fix = {
          summary: summary ?? "(verification failed)",
          fixes,
          at: nowIso(),
          verification,
        };
        await saveState(config.auditDir, state);
        await writeToc(config.auditDir, state);
        await finish(
          ctx,
          "verification-failed",
          `\`${config.verifyCommand}\` still fails after 2 repair attempts. Changes were left uncommitted for inspection.`,
        );
        return;
      }
    }

    iteration.fix = {
      summary: summary ?? "(no summary)",
      fixes,
      at: nowIso(),
      verification: verification ?? undefined,
    };
    iteration.finishedAt = nowIso();

    // Write state/TOC before committing so they are part of the iteration's
    // commit. Commit metadata (hash/output) is logged, not persisted, so this
    // stays the only state write for the iteration.
    await saveState(config.auditDir, state);
    await writeToc(config.auditDir, state);

    const title = `chore(audit): iteration ${iteration.iteration} - score ${audit.score}/100`;
    const body = summaryForCommit(
      iteration,
      verification ? { ok: verification.ok, command: verification.command } : undefined,
    );
    const outcome = await commitAll({
      cwd: config.cwd,
      title,
      body,
      exclude: (() => {
        const logs = relative(config.cwd, join(config.auditDir, "logs"));
        return logs && !logs.startsWith("..") ? [logs] : [];
      })(),
    });
    ctx.lastCommit = {
      ok: outcome.committed,
      hash: outcome.hash,
      reason: outcome.reason,
    };

    const elapsed = Math.round((Date.now() - started) / 1000);
    if (outcome.committed) {
      log("fixer", `done in ${elapsed}s — committed ${outcome.hash ?? "?"}`);
    } else if (outcome.reason === "no changes to commit") {
      warn("fixer", `done in ${elapsed}s — no changes to commit`);
    } else {
      await finish(
        ctx,
        "error",
        `commit failed: ${outcome.reason ?? "unknown"}\n${outcome.output.slice(-3000)}`,
      );
      return;
    }
  } finally {
    ctx.activeHandle = null;
    await handle.dispose();
  }
}

async function maybeFinishAfterFix(ctx: RuntimeContext): Promise<boolean> {
  const { state } = ctx;
  const last = state.iterations.at(-1);
  if (!last?.fix) return false;

  const audit = last.audit!;
  const committed = ctx.lastCommit?.ok === true;

  if (!committed) {
    const recorded = last.fix.fixes.length;
    const skipped = last.fix.fixes.filter(
      (fix) => fix.status === "skipped" || fix.status === "invalid",
    ).length;
    if (recorded === 0 || skipped === recorded) {
      await finish(
        ctx,
        "no-progress",
        recorded === 0
          ? `the fixer recorded no fixes. Score: ${audit.score}/100.`
          : `the fixer skipped or rejected all ${recorded} report(s). Score: ${audit.score}/100.`,
      );
      return true;
    }
  }

  return false;
}

async function runVerification(config: LoopConfig, command: string): Promise<VerificationResult> {
  const result = await runCommand(["bash", "-lc", command], config.cwd, {
    timeoutMs: 15 * 60_000,
  });
  const output = `${result.stdout}${result.stderr}`.trim();
  const capped = output.length > 60_000 ? `${output.slice(0, 60_000)}\n… (output truncated)` : output;
  return {
    command,
    ok: result.code === 0,
    exitCode: result.code,
    output: capped,
    at: nowIso(),
  };
}

async function finish(ctx: RuntimeContext, reason: StopReason, detail?: string): Promise<void> {
  const { config, state } = ctx;
  const latest = state.iterations.filter((iteration) => iteration.audit).at(-1);
  state.finished = {
    reason,
    at: nowIso(),
    score: latest?.audit?.score,
    detail,
  };
  await saveState(config.auditDir, state);
  await writeToc(config.auditDir, state);
  await commitAuditArtifacts(ctx, reason);

  console.log();
  section("Loop finished");
  log("loop", `reason: ${color.bold(reason)}`);
  if (latest?.audit) {
    log("loop", `score: ${color.bold(`${latest.audit.score}/100`)} (iteration ${latest.iteration})`);
  }
  if (detail) log("loop", detail);
  log("loop", `TOC: ${join(config.auditDir, "toc.md")}`);
}

/**
 * Persist the final audit artifacts when the loop stops after an audit (target,
 * convergence, max-iterations, no-progress). Only commits when every dirty path
 * is inside the audit directory, so unrelated work is never swept in.
 */
async function commitAuditArtifacts(ctx: RuntimeContext, reason: StopReason): Promise<void> {
  const { config, state } = ctx;
  if (config.dryRun) return;
  if (reason !== "target" && reason !== "converged" && reason !== "max-iterations" && reason !== "no-progress") {
    return;
  }

  const auditRelative = relative(config.cwd, config.auditDir);
  const logsRelative = relative(config.cwd, join(config.auditDir, "logs"));
  const changes = (await statusPorcelain(config.cwd)).filter(
    (line) => !(logsRelative && !logsRelative.startsWith("..") && line.includes(logsRelative)),
  );
  if (changes.length === 0) return;

  const onlyAudit = changes.every((line) => {
    const path = line.slice(3).trim().replace(/^"|"$/g, "");
    return (
      auditRelative &&
      !auditRelative.startsWith("..") &&
      (path === auditRelative || path.startsWith(`${auditRelative}/`))
    );
  });
  if (!onlyAudit) {
    warn("git", "leaving the final audit artifacts uncommitted because the tree also has non-audit changes");
    return;
  }

  const latest = state.iterations.filter((iteration) => iteration.audit).at(-1);
  const score = latest?.audit?.score;
  const title = `chore(audit): iteration ${latest?.iteration ?? "?"} - score ${score ?? "?"}/100 (final audit)`;
  const outcome = await commitAll({
    cwd: config.cwd,
    title,
    body: `Final audit artifacts after the loop stopped (${reason}).`,
    exclude: logsRelative && !logsRelative.startsWith("..") ? [logsRelative] : [],
  });
  if (outcome.committed) {
    log("git", `committed final audit ${outcome.hash ?? ""}`.trim());
  } else if (outcome.reason !== "no changes to commit") {
    warn("git", `could not commit final audit artifacts: ${outcome.reason ?? "unknown"}`);
  }
}
