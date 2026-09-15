import type { AuditResult } from "@arqen/analyzer";
import type { Project } from "@arqen/core";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type TransformationRisk = "low" | "medium" | "high";

export interface FileEdit {
  path: string;
  before: string;
  after: string;
  reason: string;
  risk: TransformationRisk;
}

export interface TransformationPlan {
  id: string;
  dryRun: boolean;
  edits: FileEdit[];
  createdAt: string;
}

export function createPlan(edits: FileEdit[], dryRun = true): TransformationPlan {
  return { id: createHash("sha256").update(JSON.stringify(edits)).digest("hex").slice(0, 16), dryRun, edits, createdAt: new Date().toISOString() };
}

function safeTarget(root: string, relativePath: string): string {
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, relativePath);
  if (target === rootPath || !target.startsWith(`${rootPath}${path.sep}`)) throw new Error(`Unsafe transformation path: ${relativePath}`);
  return target;
}

export function applyPlan(root: string, plan: TransformationPlan): { applied: string[]; skipped: string[] } {
  if (plan.dryRun) return { applied: [], skipped: plan.edits.map((edit) => edit.path) };
  const applied: string[] = [];
  const skipped: string[] = [];
  for (const edit of plan.edits) {
    const target = safeTarget(root, edit.path);
    if (!fs.existsSync(target)) { skipped.push(edit.path); continue; }
    const current = fs.readFileSync(target, "utf8");
    if (current !== edit.before) throw new Error(`Source changed since plan creation: ${edit.path}`);
    const backup = `${target}.arqen-backup`;
    fs.writeFileSync(backup, current, "utf8");
    try { fs.writeFileSync(target, edit.after, "utf8"); applied.push(edit.path); }
    catch (error) { fs.writeFileSync(target, current, "utf8"); throw error; }
  }
  return { applied, skipped };
}

export function rollbackPlan(root: string, plan: TransformationPlan): string[] {
  const restored: string[] = [];
  for (const edit of plan.edits) {
    const target = safeTarget(root, edit.path);
    const backup = `${target}.arqen-backup`;
    if (!fs.existsSync(backup)) continue;
    fs.writeFileSync(target, fs.readFileSync(backup, "utf8"), "utf8");
    fs.unlinkSync(backup);
    restored.push(edit.path);
  }
  return restored;
}

export function buildSafeAuditPlan(project: Project, audit: AuditResult): TransformationPlan {
  const edits: FileEdit[] = [];
  const tokenFinding = audit.findings.find((finding) => finding.rule === "design-system.no-tokens");
  if (tokenFinding) {
    const cssFile = project.files.find((file) => /\.(css|scss|sass)$/.test(file.extension) && file.path.startsWith("src/"));
    if (cssFile) {
      const absolute = safeTarget(project.root, cssFile.path);
      const before = fs.readFileSync(absolute, "utf8");
      const after = `:root { --arqen-space-1: 0.25rem; --arqen-space-2: 0.5rem; --arqen-space-3: 0.75rem; --arqen-space-4: 1rem; }\n\n${before}`;
      edits.push({ path: cssFile.path, before, after, reason: tokenFinding.recommendation, risk: "low" });
    }
  }
  return createPlan(edits, true);
}
