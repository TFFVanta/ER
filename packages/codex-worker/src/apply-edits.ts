import fs from "node:fs";
import path from "node:path";

// The format a local model is instructed to reply in (see LOCAL_EDIT_FORMAT_PROMPT below).
// Full-file-content blocks, not diffs: local/small models are far more reliable at
// reproducing "here is the whole new file" than at producing line-accurate unified diffs,
// and a wrong diff silently corrupts a file where a wrong full-file write just overwrites it
// with the (still wrong, but at least self-consistent) intended content.
const WRITE_START = /^===EXOTIC-WRITE-FILE: (.+?)===\s*$/;
const WRITE_END = /^===EXOTIC-END-FILE===\s*$/;
const DELETE_LINE = /^===EXOTIC-DELETE-FILE: (.+?)===\s*$/;

export type FileEdit =
  | { kind: "write"; path: string; content: string }
  | { kind: "delete"; path: string };

export function parseFileEdits(text: string): FileEdit[] {
  const lines = text.split(/\r?\n/);
  const edits: FileEdit[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const writeMatch = line.match(WRITE_START);
    const deleteMatch = line.match(DELETE_LINE);
    if (writeMatch) {
      const filePath = writeMatch[1].trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !WRITE_END.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      // Missing END marker: the model's reply was truncated. Skip this block rather than
      // applying a partial file - a partial write is worse than no write.
      if (i < lines.length) {
        edits.push({ kind: "write", path: filePath, content: body.join("\n") });
      }
      i += 1;
      continue;
    }
    if (deleteMatch) {
      edits.push({ kind: "delete", path: deleteMatch[1].trim() });
      i += 1;
      continue;
    }
    i += 1;
  }
  return edits;
}

export interface AppliedEdit {
  path: string;
  kind: FileEdit["kind"];
}

export interface ApplyFileEditsResult {
  applied: AppliedEdit[];
  rejected: Array<{ path: string; reason: string }>;
}

// Resolves an edit's path against cwd and refuses anything that would land outside it
// (absolute paths, `../` escapes, symlink tricks via a component that isn't a real dir yet).
// The model's output is untrusted input being turned into filesystem writes - this is the
// one check standing between a bad completion and writing outside the intended workspace.
function resolveSafePath(cwd: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) return null;
  const resolved = path.resolve(cwd, relativePath);
  const cwdWithSep = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;
  if (resolved !== cwd && !resolved.startsWith(cwdWithSep)) return null;
  return resolved;
}

export function applyFileEdits(cwd: string, edits: readonly FileEdit[]): ApplyFileEditsResult {
  const applied: AppliedEdit[] = [];
  const rejected: Array<{ path: string; reason: string }> = [];

  for (const edit of edits) {
    const target = resolveSafePath(cwd, edit.path);
    if (!target) {
      rejected.push({ path: edit.path, reason: "path escapes the workspace" });
      continue;
    }
    if (edit.kind === "write") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, edit.content);
      applied.push({ path: edit.path, kind: "write" });
    } else {
      try {
        fs.rmSync(target, { force: true });
        applied.push({ path: edit.path, kind: "delete" });
      } catch (error) {
        rejected.push({
          path: edit.path,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { applied, rejected };
}

// Appended to the roadmap-cell prompt only for the local backend - claudeBackend/codexBackend
// invoke full agent CLIs that already read/write files themselves, but localBackend is a bare
// chat-completion call, so the model has to be told explicitly how to hand back edits in a
// format this adapter can mechanically apply.
export const LOCAL_EDIT_FORMAT_PROMPT = [
  "Reply with the file changes needed for this step using exactly this format, one block per",
  "file, with no other prose outside the blocks:",
  "",
  "===EXOTIC-WRITE-FILE: relative/path/to/file.ext===",
  "<the complete new content of the file>",
  "===EXOTIC-END-FILE===",
  "",
  "To delete a file instead, emit a single line:",
  "===EXOTIC-DELETE-FILE: relative/path/to/file.ext===",
  "",
  "Always write the full file content, not a diff or excerpt. Use paths relative to the",
  "repository root. Do not wrap blocks in markdown code fences.",
].join("\n");
