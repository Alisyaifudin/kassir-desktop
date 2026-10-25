/**
 * Git helpers. The harness owns commits: the fixer must never run git history
 * commands, and the loop commits exactly once per completed iteration.
 */

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function runCommand(
  cmd: string[],
  cwd: string,
  options: { timeoutMs?: number } = {},
): Promise<CommandResult> {
  const controller = new AbortController();
  const timeout = options.timeoutMs
    ? setTimeout(() => controller.abort(), options.timeoutMs)
    : undefined;
  try {
    const proc = Bun.spawn({
      cmd,
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      signal: controller.signal,
      env: process.env,
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { code, stdout, stderr };
  } catch (err) {
    if (controller.signal.aborted) {
      return { code: 124, stdout: "", stderr: `Command timed out: ${cmd.join(" ")}` };
    }
    return { code: 1, stdout: "", stderr: err instanceof Error ? err.message : String(err) };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function git(args: string[], cwd: string): Promise<CommandResult> {
  return runCommand(["git", ...args], cwd);
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await git(["rev-parse", "--is-inside-work-tree"], cwd);
  return result.code === 0 && result.stdout.trim() === "true";
}

export async function statusPorcelain(cwd: string): Promise<string[]> {
  const result = await git(["status", "--porcelain", "--untracked-files=all"], cwd);
  if (result.code !== 0) throw new Error(result.stderr || "git status failed");
  return result.stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

export async function headHash(cwd: string): Promise<string | undefined> {
  const result = await git(["rev-parse", "--short", "HEAD"], cwd);
  return result.code === 0 ? result.stdout.trim() : undefined;
}

export async function lastCommits(cwd: string, count = 5): Promise<string> {
  const result = await git(["log", `-${count}`, "--oneline", "--decorate"], cwd);
  return result.code === 0 ? result.stdout.trim() : "(no commits)";
}

export async function diffStat(cwd: string, from?: string): Promise<string> {
  const args = from ? ["diff", "--stat", from, "HEAD"] : ["diff", "--stat"];
  const result = await git(args, cwd);
  return result.code === 0 ? result.stdout.trim() : "";
}

export interface CommitInput {
  cwd: string;
  title: string;
  body: string;
  /** Paths to keep out of the commit even if they are not git-ignored. */
  exclude?: string[];
}

export interface CommitOutcome {
  committed: boolean;
  hash?: string;
  output: string;
  reason?: string;
}

/**
 * Stage everything and commit. Retries once after re-staging, because
 * pre-commit hooks that auto-format files return non-zero after modifying the
 * working tree.
 */
export async function commitAll(input: CommitInput): Promise<CommitOutcome> {
  const stage = async (): Promise<CommandResult> => {
    const added = await git(["add", "-A"], input.cwd);
    if (added.code !== 0) return added;
    for (const path of input.exclude ?? []) {
      // Unstage generated logs even when the project does not ignore them.
      await git(["reset", "--quiet", "--", path], input.cwd);
    }
    return added;
  };

  const staged = await stage();
  if (staged.code !== 0) {
    return { committed: false, output: staged.stderr, reason: "git add failed" };
  }

  const stagedDiff = await git(["diff", "--cached", "--quiet"], input.cwd);
  if (stagedDiff.code === 0) {
    return { committed: false, output: "", reason: "no changes to commit" };
  }

  const attempt = async (): Promise<CommandResult> =>
    runCommand(["git", "commit", "-m", input.title, "-m", input.body], input.cwd);

  let result = await attempt();
  if (result.code !== 0) {
    // A hook may have reformatted files. Re-stage and try once more.
    await stage();
    result = await attempt();
  }

  if (result.code !== 0) {
    return {
      committed: false,
      output: `${result.stdout}\n${result.stderr}`.trim(),
      reason: "git commit failed",
    };
  }

  const hash = await headHash(input.cwd);
  return {
    committed: true,
    hash,
    output: `${result.stdout}\n${result.stderr}`.trim(),
  };
}
