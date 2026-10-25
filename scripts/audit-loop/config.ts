/**
 * CLI configuration for the audit → fix → commit loop.
 */

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface LoopConfig {
  cwd: string;
  auditDir: string;
  /** Model reference, e.g. `anthropic/claude-sonnet-4-5` or a bare id. */
  model?: string;
  provider?: string;
  auditorModel?: string;
  fixerModel?: string;
  thinking?: ThinkingLevel;
  /** Stop once the auditor's weighted score reaches this value. */
  targetScore: number;
  /** Number of recent scores used for convergence detection. */
  convergeWindow: number;
  /** Stop when max(recent) - min(recent) <= this value. */
  convergeEpsilon: number;
  maxIterations: number;
  /** Verification command run after the fixer. `null` disables it. */
  verifyCommand: string | null;

  dryRun: boolean;
  allowDirty: boolean;
  force: boolean;
  verbose: boolean;
  agentTimeoutMinutes: number;
}

const THINKING_LEVELS: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

function parseNumber(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${flag} expects a number, got "${raw}"`);
  return value;
}

export function parseArgv(argv: string[]): LoopConfig {
  const config: LoopConfig = {
    cwd: process.cwd(),
    auditDir: "audit",
    model: undefined,
    provider: undefined,
    auditorModel: undefined,
    fixerModel: undefined,
    thinking: undefined,
    targetScore: 95,
    convergeWindow: 5,
    convergeEpsilon: 2,
    maxIterations: 20,
    verifyCommand: "bun run lint",
    dryRun: false,
    allowDirty: false,
    force: false,
    verbose: false,
    agentTimeoutMinutes: 30,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1);
    const value = (): string => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) throw new Error(`${flag} expects a value`);
      i++;
      return next;
    };

    switch (flag) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--model":
        config.model = value();
        break;
      case "--provider":
        config.provider = value();
        break;
      case "--auditor-model":
        config.auditorModel = value();
        break;
      case "--fixer-model":
        config.fixerModel = value();
        break;
      case "--thinking": {
        const level = value() as ThinkingLevel;
        if (!THINKING_LEVELS.includes(level)) {
          throw new Error(`--thinking must be one of ${THINKING_LEVELS.join(", ")}`);
        }
        config.thinking = level;
        break;
      }
      case "--target":
        config.targetScore = parseNumber(value(), "--target");
        break;
      case "--window":
        config.convergeWindow = parseNumber(value(), "--window");
        break;
      case "--epsilon":
        config.convergeEpsilon = parseNumber(value(), "--epsilon");
        break;
      case "--max-iterations":
        config.maxIterations = parseNumber(value(), "--max-iterations");
        break;
      case "--verify":
        config.verifyCommand = value();
        break;
      case "--no-verify":
        config.verifyCommand = null;
        break;
      case "--audit-dir":
        config.auditDir = value();
        break;
      case "--agent-timeout":
        config.agentTimeoutMinutes = parseNumber(value(), "--agent-timeout");
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--allow-dirty":
        config.allowDirty = true;
        break;
      case "--force":
        config.force = true;
        break;
      case "--verbose":
        config.verbose = true;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}. Run with --help.`);
    }
  }

  if (config.targetScore < 0 || config.targetScore > 100) {
    throw new Error("--target must be between 0 and 100");
  }
  if (config.convergeWindow < 2) throw new Error("--window must be at least 2");
  if (config.convergeEpsilon < 0) throw new Error("--epsilon must be >= 0");
  if (config.maxIterations < 1) throw new Error("--max-iterations must be at least 1");
  if (config.agentTimeoutMinutes < 1) throw new Error("--agent-timeout must be at least 1");

  return config;
}

export function printHelp(): void {
  console.log(`
Audit loop — two pi agents (auditor → fixer) run continuously until the
codebase's audit score reaches the target or converges.

Usage:
  bun run audit:loop [options]
  bun scripts/audit-loop/index.ts [options]

Options:
  --model <ref>            Model for both agents (provider/id or bare id)
  --provider <id>          Provider for --model / env fallback
  --auditor-model <ref>    Override the model used by the auditor
  --fixer-model <ref>      Override the model used by the fixer
  --thinking <level>       off|minimal|low|medium|high|xhigh|max
  --target <n>             Stop at this score (default 95)
  --window <n>             Scores used for convergence check (default 5)
  --epsilon <n>            Max spread over the window (default 2)
  --max-iterations <n>     Hard cap on auditor runs (default 20)
  --verify <cmd>           Verification command after the fixer (default "bun run lint")
  --no-verify              Skip verification
  --audit-dir <path>       Report directory (default "audit")
  --agent-timeout <min>    Per-agent wall-clock timeout (default 30)
  --dry-run                Run the auditor only; no fixes, no commits
  --allow-dirty            Allow starting with uncommitted changes
  --force                  Ignore a previous run's finished marker
  --verbose                Print tool arguments
  -h, --help               Show this help

Model resolution order per agent:
  --auditor-model / --fixer-model > --model > PI_MODEL > ~/.pi/agent settings
  > first available model. --provider and PI_PROVIDER narrow the lookup.

Exit codes:
  0  target reached, converged, or dry-run completed
  1  harness error (git, agent, verification)
  2  invalid arguments
`);
}
