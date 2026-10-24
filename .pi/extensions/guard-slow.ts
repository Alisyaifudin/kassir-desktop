/**
 * Hard Rule #0, enforced.
 *
 * Prose in an instruction file is a request; this is a gate. It runs before any
 * `bash` call and refuses the commands that cost the user minutes — e2e, app
 * launches, builds, installs — unless they have said yes. Their yes is the file
 * `.pi/allow-slow`, so permission lives in their hands, not in the model's
 * memory of the conversation.
 *
 *   touch .pi/allow-slow   # grant
 *   rm .pi/allow-slow      # take it back
 *
 * See `.pi/APPEND_SYSTEM.md` for the rule this implements.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const SLOW: RegExp[] = [
  // e2e / app
  /\b(npx|bunx|pnpm|yarn|bun|npm)\s+(exec\s+)?playwright\b/i,
  /^\s*playwright\b/i,
  /\bplaywright\s+(test|install)\b/i,
  /\btauri\s+(dev|build)\b/i,
  /\btauri:(dev|build)\b/i,
  /\bbun\s+run\s+tauri\b/i,
  /\b(vite|next)\s+(dev|build)\b/i,
  /\b(bun|npm|pnpm|yarn)\s+run\s+(dev|build|preview)\b/i,
  // compilers / installs
  /\bcargo\s+(build|test|run)\b/i,
  /\b(bun|npm|pnpm|yarn)\s+(install|i|add|ci)\b/i,
  // whole-repo sweeps
  /\bgit\s+log\b[^|;&]*(--follow|--all)\b/i,
  /\bbun\s+test\s*(?:$|[|;&])/i,
];

const ALLOW_FILE = join(process.cwd(), ".pi", "allow-slow");

export default function (pi) {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return undefined;

    const command = String(event.input?.command ?? "");
    if (!SLOW.some((pattern) => pattern.test(command))) return undefined;
    if (existsSync(ALLOW_FILE)) return undefined;

    return {
      block: true,
      reason:
        "BLOCKED by .pi/extensions/guard-slow.ts (Hard Rule #0). This is an e2e/build/install command. " +
        "Do the asked thing instead. If a check is genuinely needed, ask the user in ONE line and stop. " +
        "If they approve, they run `touch .pi/allow-slow` (and `rm .pi/allow-slow` after), or run it themselves.",
    };
  });
}
