#!/usr/bin/env bun
/**
 * `prepare` — point git at `.githooks` so `pre-commit` / `pre-push` actually run.
 *
 * Why this is a script and not one line of shell in package.json
 * -------------------------------------------------------------
 * It used to be:
 *
 *   "prepare": "git rev-parse --git-dir >/dev/null 2>&1 && git config core.hooksPath .githooks || true"
 *
 * That parses fine under a POSIX shell and under bun's shell on Linux, and it
 * fails on the Windows runner with
 *
 *   error: Failed to run script ... due to error expected a command or assignment but got: "Redirect"
 *   error: prepare script from "kassir" exited with 1
 *
 * which turns `bun install` — the very first step of the publish job — red.
 * `bun run` executes a package script through bun's own cross-platform shell,
 * and `>/dev/null 2>&1` is not part of the subset it accepts there. The gate
 * that exists to keep CI green was itself the thing making CI red.
 *
 * So: no shell metacharacters at all. Two `git` spawns, no redirection, no
 * `&&`/`||`, nothing for a shell to mis-parse on any platform.
 *
 * Never fails the install. A tarball, a packaged app, or a machine without git
 * has no repo to configure and no use for hooks — that is not an error, it is
 * the wrong context for this step, so it exits 0 silently.
 */
import { spawnSync } from "node:child_process";

// `--git-dir` is the cheapest "is this a repo?" probe, and it stays quiet.
const probe = spawnSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
if (probe.error || probe.status !== 0) {
  // No git binary or no repo: nothing to install, and nothing to complain about.
  process.exit(0);
}

const set = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
});
process.exit(set.status ?? 0);
