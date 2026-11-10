#!/usr/bin/env bun
/**
 * The CI mirror — one command that runs every gate `.github/workflows/windows-release.yml`
 * runs, with the same flags, in the same blocking/non-blocking posture.
 *
 * Why this file exists
 * --------------------
 * Between 2026-10-26 and 2026-11-04 the `Publish Windows App` workflow went red
 * on 8 of the last 18 completed pushes to master. Not one failure was a subtle
 * bug:
 *
 *   rust / Formatting   3x   cargo fmt --check           0.1 s locally
 *   rust / Clippy       2x   cargo clippy -D warnings    cached locally
 *   rust / Rust tests   1x   cargo test                  1.8 s of tests
 *   publish / Typecheck 1x   tsc --noEmit               10 s
 *   publish / Unit     2x   bun test                    40 s
 *
 * Every one of them is a local command that finishes before you can switch
 * windows. The gap was never "hard to verify" — it was that nothing ran them.
 * A human remembers `tsc` and maybe `bun test`; nobody remembers rustfmt. So the
 * gates now live in one list, and `.githooks/pre-commit` / `pre-push` call it.
 *
 * The rule this enforces: a gate that can only fail in CI is a gate that only
 * fails in CI. Anything you cannot run here must not be a gate there.
 *
 * Usage
 *   bun scripts/ci.ts            # everything except e2e  (~2-3 min warm) ← not the mirror
 *   bun scripts/ci.ts --fast     # rustfmt + typecheck + lint  (~18 s) ← pre-commit
 *   bun scripts/ci.ts --full     # everything, e2e included  (~4 min) ← pre-push, what CI runs
 *   bun scripts/ci.ts --only=lint,typecheck   # just these gates
 *   bun scripts/ci.ts --list     # the mapping, gate → workflow step
 *
 * Exit code 0 means the workflow's blocking jobs would be green.
 */

type Tier = "fast" | "core" | "full";

interface Gate {
  id: string;
  /** The exact command line, as argv — no shell, so it is identical on Windows. */
  cmd: string[];
  /** Where it lives in the workflow, so a drift between the two is visible. */
  mirror: string;
  /** Lowest tier that includes this gate. Tiers nest: fast ⊂ core ⊂ full. */
  tier: Tier;
  timeoutMs: number;
  /**
   * `continue-on-error: true` in the workflow. A red unit suite is a report,
   * not a shipping decision: it prints, it lands in the summary, and the run
   * still exits 0 — exactly as CI treats it. Silent redness is what is not
   * allowed.
   */
  advisory?: boolean;
}

const MIN = 60_000;

const GATES: Gate[] = [
  {
    // Cheapest signal in the repo and the one CI punished three times. It runs
    // in a tenth of a second: there is no excuse for it ever reaching a push.
    id: "rustfmt",
    cmd: ["cargo", "fmt", "--manifest-path", "src-tauri/Cargo.toml", "--check"],
    mirror: "rust / Formatting",
    tier: "fast",
    timeoutMs: 1 * MIN,
  },
  {
    id: "typecheck",
    cmd: ["bun", "run", "typecheck"],
    mirror: "publish / Typecheck",
    tier: "fast",
    timeoutMs: 5 * MIN,
  },
  {
    id: "lint",
    cmd: ["bun", "run", "lint"],
    mirror: "publish / Lint",
    tier: "fast",
    timeoutMs: 5 * MIN,
  },
  {
    // `--all-targets` is the flag that matters: it lints test modules too, and
    // the failure that got through was in `#[cfg(test)]` code that plain
    // `cargo clippy` never looked at.
    id: "clippy",
    cmd: [
      "cargo",
      "clippy",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--all-targets",
      "--",
      "-D",
      "warnings",
    ],
    mirror: "rust / Clippy",
    tier: "core",
    timeoutMs: 15 * MIN,
  },
  {
    id: "rust-tests",
    cmd: ["cargo", "test", "--manifest-path", "src-tauri/Cargo.toml"],
    mirror: "rust / Rust tests",
    tier: "core",
    timeoutMs: 10 * MIN,
  },
  {
    id: "unit",
    cmd: ["bun", "test"],
    mirror: "publish / Unit tests",
    tier: "core",
    timeoutMs: 10 * MIN,
    advisory: true,
  },
  {
    // The workflow never runs this directly — `tauri build` does (`tsc && vite build`).
    // A broken import or a bad CSS/Vite transform therefore used to first appear
    // minutes into the Windows installer build.
    id: "build",
    cmd: ["bun", "run", "build"],
    mirror: "publish / Build and Release (tauri build → bun run build)",
    tier: "core",
    timeoutMs: 10 * MIN,
  },
  {
    id: "e2e",
    cmd: ["bun", "run", "test:e2e"],
    mirror: "e2e / End-to-end tests",
    tier: "full",
    timeoutMs: 20 * MIN,
  },
];

/**
 * Ordering. Rows run one after another; gates inside a row run concurrently.
 *
 * - Row 1 is the fast set: three independent read-only checks, and together they
 *   are the whole pre-commit budget.
 * - Row 2 is serialised cargo on purpose: clippy and test share `src-tauri/target`,
 *   so running them together means one waits on the other's lock anyway.
 * - Row 3 is independent of cargo: the JS suite and the Vite build.
 * - Row 4 is e2e, last, because it is the only gate that needs a browser.
 */
const PHASES: string[][] = [
  ["rustfmt", "typecheck", "lint"],
  ["clippy", "rust-tests"],
  ["unit", "build"],
  ["e2e"],
];

// ── output ─────────────────────────────────────────────────────────────────

const NO_COLOR = !process.stdout.isTTY || process.argv.includes("--no-color");
const paint = (code: number, s: string) => (NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`);
const dim = (s: string) => paint(2, s);
const bold = (s: string) => paint(1, s);
const green = (s: string) => paint(32, s);
const red = (s: string) => paint(31, s);
const yellow = (s: string) => paint(33, s);

// ── args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);

if (has("--help") || has("-h")) {
  console.log(
    [
      "bun scripts/ci.ts [--fast|--full] [--verbose] [--list]",
      "",
      "  (default)   every gate except e2e — the quick set, NOT the mirror",
      "  --fast      rustfmt + typecheck + lint only — the pre-commit set",
      "  --full      every gate, e2e included — the pre-push set, and what CI runs",
      "  --only=a,b  run exactly these gates (implied: no tier filtering)",
      "  --verbose   print each gate's output, even when the gate passes",
      "  --list      print gate → workflow-step mapping and exit",
    ].join("\n"),
  );
  process.exit(0);
}

const verbose = has("--verbose");
const tier: Tier = has("--full") ? "full" : has("--fast") ? "fast" : "core";
const rank: Record<Tier, number> = { fast: 0, core: 1, full: 2 };

// `--only` exists for the second and third pass of a fixing loop: after editing a
// lint, re-running clippy is a coin flip on whether you learn anything. It
// bypasses the tier filter entirely — asking for a gate is permission enough.
const onlyArg = argv.find((a) => a.startsWith("--only"));
const only = onlyArg
  ? new Set(
      (onlyArg.includes("=") ? onlyArg.slice(onlyArg.indexOf("=") + 1) : argv[argv.indexOf(onlyArg) + 1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

if (only) {
  const unknown = [...only].filter((id) => !GATES.some((g) => g.id === id));
  if (unknown.length > 0) {
    console.error(
      red(`unknown gate${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`) +
        dim(` — known: ${GATES.map((g) => g.id).join(", ")}`),
    );
    process.exit(2);
  }
}

if (has("--list")) {
  for (const g of GATES) {
    const mark = rank[g.tier] <= rank[tier] ? "*" : " ";
    console.log(
      `${mark} ${g.id.padEnd(11)} ${g.tier.padEnd(5)} → ${g.mirror}${g.advisory ? "  (advisory)" : ""}`,
    );
    console.log(`  ${" ".repeat(11)} ${g.cmd.join(" ")}`);
  }
  process.exit(0);
}

const selected = GATES.filter((g) =>
  only ? only.has(g.id) : rank[g.tier] <= rank[tier],
);
const selectedIds = new Set(selected.map((g) => g.id));
const phases = PHASES.map((row) => row.filter((id) => selectedIds.has(id))).filter(
  (row) => row.length > 0,
);

// ── output helpers (the colour functions live above, with the arg parsing) ──
const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
const tail = (text: string, lines = 60) => {
  const all = text.trimEnd().split("\n");
  const shown = all.slice(-lines);
  if (all.length > shown.length) {
    shown.unshift(dim(`… ${all.length - shown.length} earlier lines elided`));
  }
  return shown.join("\n");
};

// ── runner ──────────────────────────────────────────────────────────────────

interface Result {
  gate: Gate;
  ok: boolean;
  ms: number;
  output: string;
  timedOut: boolean;
}

async function run(gate: Gate): Promise<Result> {
  const started = performance.now();
  let output = "";
  let timedOut = false;

  const proc = Bun.spawn({
    cmd: gate.cmd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "1", CI: "1" },
    signal: AbortSignal.timeout(gate.timeoutMs),
  });

  // Drain both pipes concurrently: a gate that fills a pipe buffer while we are
  // still awaiting the other one would deadlock.
  const pipes = [proc.stdout, proc.stderr].map((stream) =>
    new Response(stream as ReadableStream<Uint8Array>).text(),
  );

  try {
    const [out, err] = await Promise.all(pipes);
    output = out + err;
    await proc.exited;
  } catch (error) {
    // An AbortSignal.timeout kill surfaces here, not as a non-zero exit code.
    timedOut = true;
    const settled = await Promise.allSettled(pipes);
    output = settled.map((s) => (s.status === "fulfilled" ? s.value : "")).join("");
    output += `\n\n${red(`killed after ${secs(gate.timeoutMs)} — the workflow allows the same`)}`;
    void error;
  }

  const ms = performance.now() - started;
  const ok = !timedOut && proc.exitCode === 0;
  return { gate, ok, ms, output, timedOut };
}

const results: Result[] = [];
let stoppedEarly = false;
const scriptStart = performance.now();

console.log(
  bold(
    `CI mirror — ${only ? `only ${[...only].join(", ")}` : `${tier} tier`}, ` +
      `${selected.length} gate${selected.length === 1 ? "" : "s"}`,
  ),
);
console.log(dim(`mirrors .github/workflows/windows-release.yml` + (tier === "full" ? "" : " — PARTIAL: this run skips gates the workflow runs")));
console.log();

for (const [index, row] of phases.entries()) {
  console.log(dim(`── phase ${index + 1}/${phases.length} ──`));

  for (const id of row) {
    const gate = selected.find((g) => g.id === id)!;
    console.log(`   ${dim("▶")} ${gate.id.padEnd(11)} ${dim(gate.cmd.join(" "))}`);
  }

  const settled = await Promise.all(
    row.map((id) => run(selected.find((g) => g.id === id)!)),
  );
  results.push(...settled);

  for (const r of settled) {
    const label = r.gate.id.padEnd(11);
    if (r.ok) {
      console.log(`   ${green("✓")} ${label} ${dim(secs(r.ms))}`);
      if (verbose && r.output.trim()) console.log(dim(tail(r.output, 20)));
    } else if (r.gate.advisory) {
      console.log(`   ${yellow("!")} ${label} ${yellow(secs(r.ms))} ${dim("advisory — CI marks red, job continues")}`);
    } else {
      console.log(`   ${red("✗")} ${label} ${red(secs(r.ms))}`);
    }
  }
  console.log();

  const blockingFailure = settled.some((r) => !r.ok && !r.gate.advisory);
  if (blockingFailure) {
    stoppedEarly = phases.length > index + 1;
    break;
  }
}

// ── failure detail ──────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok);

for (const r of failed) {
  const heading = r.gate.advisory ? yellow(`advisory failure — ${r.gate.id}`) : red(`FAILED — ${r.gate.id}`);
  console.log(`${bold(heading)}  ${dim(`(${r.gate.mirror})`)}`);
  console.log(dim(`$ ${r.gate.cmd.join(" ")}`));
  console.log(tail(r.output));
  console.log();
}

// ── summary ─────────────────────────────────────────────────────────────────

const blocking = failed.filter((r) => !r.gate.advisory);
const advisory = failed.filter((r) => r.gate.advisory);
const skipped = GATES.filter((g) => !selectedIds.has(g.id));
// Wall clock, not the sum of gate durations: the phases overlap, so summing
// would report a wait longer than the one the user actually sat through.
const total = performance.now() - scriptStart;

const line = "─".repeat(64);
console.log(line);
const nameWidth = Math.max(...results.map((r) => r.gate.id.length), 4) + 2;
for (const r of results) {
  const state = r.ok ? green("ok  ") : r.gate.advisory ? yellow("warn") : red("FAIL");
  console.log(` ${r.gate.id.padEnd(nameWidth)} ${state} ${dim(secs(r.ms).padStart(6))}`);
}
console.log(line);

if (blocking.length > 0) {
  console.log(
    red(`${blocking.length} blocking gate${blocking.length === 1 ? "" : "s"} red`) +
      dim(
        ` · this push would have failed CI` +
          (stoppedEarly ? " · later phases not run" : ""),
      ),
  );
  console.log(dim(`Fix with: bun scripts/ci.ts --full   after the failures above are addressed`));
  process.exit(1);
}

if (advisory.length > 0) {
  console.log(
    yellow(`${advisory.length} advisory gate${advisory.length === 1 ? "" : "s"} red`) +
      dim(" · CI stays green, the run is annotated red. This is a borrowed pass, not a bug-free one."),
  );
}

if (skipped.length > 0) {
  // Loud on purpose. The quiet version of this line shipped three pushes that
  // read "all 7 gates green" and went red on GitHub, because the reader (and the
  // agent summarising it) took the headline and dropped the footnote. A skipped
  // gate the workflow runs is not a smaller result — it is a different claim.
  console.log(
    yellow(`NOT RUN: ${skipped.map((g) => g.id).join(", ")}`) +
      dim(` — the workflow runs ${skipped.length === 1 ? "it" : "them"} on every push to master`),
  );
  console.log(
    dim(
      only
        ? `   you asked for these gates only. \`bun scripts/ci.ts --full\` is the one that matches CI.`
        : tier === "fast"
          ? `   this is the pre-commit set. \`bun scripts/ci.ts --full\` is the one that matches CI.`
          : `   this is the ${tier} tier, not the mirror. \`bun scripts/ci.ts --full\` is the one that matches CI.`,
    ),
  );
}

console.log(
  skipped.length === 0
    ? green(`\nall ${results.length} gates green in ${secs(total)}`) +
        dim(" · this is the whole workflow — safe to push")
    : yellow(`\n${results.length} of ${GATES.length} gates green in ${secs(total)}`) +
        red(` · ${skipped.map((g) => g.id).join(", ")} unverified — green here is NOT green on GitHub`),
);
