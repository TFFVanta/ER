import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import type { ProductionCellContext, ProductionReceipt, ProductionWorker } from "@exotic/workflow";
import { captureEvidence, snapshotWorkingTree } from "./evidence.js";
import { applyFileEdits, LOCAL_EDIT_FORMAT_PROMPT, parseFileEdits } from "./apply-edits.js";

// Reflects docs/AUTO_MODE_MASTER_PLAN.md's approval-gated-actions list. This is a prompt
// instruction, not a sandbox - it relies on the invoked agent following it, the same trust
// model as any other agent invocation. It does not technically prevent anything.
const GUARDRAIL_PROMPT = [
  "Boundaries for this run:",
  "- Do not push to any git remote.",
  "- Do not perform destructive, repo-wide operations (mass deletes, history rewrites, force operations).",
  "- Do not make financial, legal, or public-launch commitments.",
  "- Do not change governance, authority, or approval rules.",
  "- Stay scoped to the one step described below; do not start unrelated work.",
].join("\n");

function buildCellPrompt(context: ProductionCellContext): string {
  return [
    "You are executing one roadmap production cell for the EXOTIC project.",
    `Step: ${context.job.id} - ${context.job.title}`,
    `Lane: ${context.job.lane}`,
    `Attempt: ${context.attempt}`,
    "",
    GUARDRAIL_PROMPT,
    "",
    "Make one concrete, verifiable change that advances this step. Do not mark anything",
    "as complete yourself - a separate evidence-capture step records what actually changed.",
  ].join("\n");
}

interface CliCommand {
  executable: string;
  prefixArgs: string[];
}

function resolveCodexCommand(): CliCommand {
  const configured = process.env.EXOTIC_CODEX_CLI;
  const installedScript = process.env.APPDATA
    ? path.join(process.env.APPDATA, "npm", "node_modules", "@openai", "codex", "bin", "codex.js")
    : null;
  const candidate = configured || (installedScript && fs.existsSync(installedScript) ? installedScript : null);
  return candidate?.toLowerCase().endsWith(".js")
    ? { executable: process.execPath, prefixArgs: [candidate] }
    : { executable: candidate || "codex", prefixArgs: [] };
}

// Async (execFile), not sync (execFileSync): a dispatch is a single-threaded Node process
// waiting on this, and a real agent invocation can run for minutes. execFileSync would
// block the whole event loop for that entire duration - freezing every other bridge API
// endpoint (health, pause, status) along with it. Confirmed empirically: a real ~26s codex
// CLI invocation made the server completely unresponsive to any other request until it
// returned, when this was still using execFileSync.
const execFileAsync = promisify(execFile);

async function runCli(
  command: CliCommand,
  args: readonly string[],
  options: { cwd?: string; maxBuffer?: number },
): Promise<string> {
  const { stdout } = await execFileAsync(command.executable, [...command.prefixArgs, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
  });
  return stdout;
}

async function assertCliAvailable(command: CliCommand, backendName: string): Promise<void> {
  try {
    await runCli(command, ["--version"], {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${backendName} backend requires its CLI, but it could not be run (${message}). ` +
        `Install it, configure its executable, or choose a different --backend.`,
    );
  }
}

export interface CliBackendOptions {
  cwd: string;
  extraArgs?: readonly string[];
}

// Spawns the `claude` CLI in headless/print mode for one roadmap cell. The exact flags
// below match Claude Code's non-interactive `-p`/print mode at the time this was written;
// verify against `claude --help` before relying on this in an environment where the CLI
// wasn't available to test against directly.
export function claudeBackend(options: CliBackendOptions): ProductionWorker<string> {
  return async (context): Promise<ProductionReceipt<string>> => {
    const command = { executable: "claude", prefixArgs: [] };
    await assertCliAvailable(command, "claude");
    const before = snapshotWorkingTree(options.cwd);
    const prompt = buildCellPrompt(context);
    let output: string;
    try {
      output = await runCli(
        command,
        ["-p", prompt, "--output-format", "json", ...(options.extraArgs ?? [])],
        { cwd: options.cwd, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`claude CLI invocation failed: ${message}`);
    }
    const evidence = captureEvidence({ cwd: options.cwd, before });
    return { output, evidence };
  };
}

// Spawns the Codex CLI's non-interactive exec mode for one roadmap cell. Same caveat as
// claudeBackend: verify the exact flags against `codex --help` in an environment where the
// CLI is actually installed - it was not available to test against here.
export function codexBackend(options: CliBackendOptions): ProductionWorker<string> {
  return async (context): Promise<ProductionReceipt<string>> => {
    const command = resolveCodexCommand();
    await assertCliAvailable(command, "codex");
    const before = snapshotWorkingTree(options.cwd);
    const prompt = buildCellPrompt(context);
    let output: string;
    try {
      output = await runCli(
        command,
        [
          "exec",
          "-c",
          'service_tier="fast"',
          "--sandbox",
          "workspace-write",
          ...(options.extraArgs ?? []),
          prompt,
        ],
        { cwd: options.cwd, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`codex CLI invocation failed: ${message}`);
    }
    const evidence = captureEvidence({ cwd: options.cwd, before });
    return { output, evidence };
  };
}

export interface LocalBackendOptions {
  cwd: string;
  endpoint?: string;
  model?: string;
}

// Calls a self-hosted, OpenAI-compatible chat-completions endpoint (Ollama, LM Studio,
// vLLM, or a future fine-tuned model served the same way all work here unmodified) and
// applies the reply as real file edits - see apply-edits.ts. Unlike claudeBackend/
// codexBackend, a chat-completions endpoint has no tools of its own, so the prompt
// explicitly tells the model to reply using the EXOTIC-WRITE-FILE/EXOTIC-DELETE-FILE block
// format, and this function parses and applies those blocks before capturing evidence.
// A reply with no valid blocks (or a model that ignores the instruction) still produces no
// evidence, and dispatch.ts still correctly rejects that as a failure - the same safe
// default as before, now reachable via an actual working path instead of only the failure
// path.
export function localBackend(options: LocalBackendOptions): ProductionWorker<string> {
  return async (context): Promise<ProductionReceipt<string>> => {
    const endpoint = options.endpoint ?? process.env.EXOTIC_LOCAL_MODEL_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "local backend requires an OpenAI-compatible endpoint. Set EXOTIC_LOCAL_MODEL_ENDPOINT " +
          "(e.g. http://localhost:11434/v1) or pass { endpoint } explicitly.",
      );
    }
    const before = snapshotWorkingTree(options.cwd);
    const prompt = `${buildCellPrompt(context)}\n\n${LOCAL_EDIT_FORMAT_PROMPT}`;
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model ?? process.env.EXOTIC_LOCAL_MODEL_NAME ?? "local-model",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`local model endpoint returned ${response.status}: ${body}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const output = payload.choices?.[0]?.message?.content ?? "";
    const edits = parseFileEdits(output);
    const { rejected } = applyFileEdits(options.cwd, edits);
    const evidence = captureEvidence({ cwd: options.cwd, before });
    for (const reject of rejected) {
      evidence.push(`rejected-edit ${reject.path}: ${reject.reason}`);
    }
    return { output, evidence };
  };
}

export type BackendName = "claude" | "codex" | "local";

export function resolveBackend(
  name: BackendName,
  options: CliBackendOptions & LocalBackendOptions,
): ProductionWorker<string> {
  if (name === "claude") return claudeBackend(options);
  if (name === "codex") return codexBackend(options);
  if (name === "local") return localBackend(options);
  throw new Error(`Unknown worker backend: ${name}`);
}
