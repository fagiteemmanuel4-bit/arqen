import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, auditProject } from "@arqen/analyzer";
import { applyPlan, buildSafeAuditPlan, rollbackPlan } from "../src/plan";

describe("golden movie fixture transformation proof", () => {
  it("measures a bounded improvement and checks for regression", () => {
    const sourceRoot = path.resolve(process.cwd(), "fixtures/movie-site-fixture");
    const root = mkdtempSync(path.join(tmpdir(), "arqen-golden-transform-"));
    cpSync(sourceRoot, root, { recursive: true });
    try {
      const before = auditProject(analyzeProject(root));
      const plan = buildSafeAuditPlan(analyzeProject(root), before);
      expect(plan.edits.length).toBeGreaterThan(0);
      expect(plan.edits.every((edit) => edit.risk === "low")).toBe(true);
      expect(plan.edits.every((edit) => edit.validationStrategy.length > 0)).toBe(true);

      plan.dryRun = false;
      const applied = applyPlan(root, plan);
      expect(applied.applied).toEqual(plan.edits.map((edit) => edit.path));

      const after = auditProject(analyzeProject(root));
      expect(after.score).toBeGreaterThanOrEqual(before.score);
      expect(after.findings.some((finding) => finding.rule === "design-system.no-tokens")).toBe(false);
      expect(after.summary.critical).toBeLessThanOrEqual(before.summary.critical);
      expect(after.summary.high).toBeLessThanOrEqual(before.summary.high);

      const diffInputs = plan.edits.map((edit) => ({ path: edit.path, before: edit.before, after: edit.after }));
      expect(diffInputs.every((edit) => readFileSync(path.join(root, edit.path), "utf8") === edit.after)).toBe(true);
      expect(existsSync(path.join(root, `${plan.edits[0].path}.arqen-backup`))).toBe(true);

      expect(rollbackPlan(root, plan)).toEqual(plan.edits.map((edit) => edit.path));
      expect(auditProject(analyzeProject(root)).score).toBe(before.score);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
