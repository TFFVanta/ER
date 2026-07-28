import { execFileSync } from "node:child_process";
import type { ProductionCellContext, ProductionReceipt, ProductionWorker } from "@exotic/workflow";
import { captureEvidence, snapshotWorkingTree } from "./evidence.js";

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

function assertCliAvailable(command: string, backendName: string): void {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${backendName} backend requires the \`${command}\` CLI on PATH, but it could not be run (${message}). ` +
        `Install it, or choose a different --backend.`,
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
    assertCliAvailable("claude", "claude");
    const before = snapshotWorkingTree(options.cwd);
    const prompt = buildCellPrompt(context);
    let output: string;
    try {
      output = execFileSync(
        "claude",
        ["-p", prompt, "--output-format", "json", ...(options.extraArgs ?? [])],
        { cwd: options.cwd, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
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
    assertCliAvailable("codex", "codex");
    const before = snapshotWorkingTree(options.cwd);
    const prompt = buildCellPrompt(context);
    let output: string;
    try {
      output = execFileSync(
        "codex",
        ["exec", prompt, ...(options.extraArgs ?? [])],
        { cwd: options.cwd, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
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
// vLLM, or a future fine-tuned model served the same way all work here unmodified).
//
// Important limitation: this backend only requests a text completion - it does not apply
// that text as file edits. Until it's wired to an actual edit loop (e.g. parsing the
// response into a patch, or piping through a tool like Aider), captureEvidence will
// almost always come back empty for real work, and packages/workflow's executeProductionFabric
// will correctly reject the receipt for having no evidence rather than silently accepting
// a text response as "done." That's the deliberately safe behavior for an unfinished
// integration, not a bug: extend this once a real local/fine-tuned model and an edit loop
// exist, rather than loosening the evidence check to accommodate it.
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
    const prompt = buildCellPrompt(context);
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
    const evidence = captureEvidence({ cwd: options.cwd, before });
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
