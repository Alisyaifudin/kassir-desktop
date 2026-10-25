#!/usr/bin/env bun
/**
 * Entry point for the audit loop.
 *
 *   bun run audit:loop
 *   bun scripts/audit-loop/index.ts --help
 */

import { main } from "./loop";

const code = await main(process.argv.slice(2));
process.exit(code);
