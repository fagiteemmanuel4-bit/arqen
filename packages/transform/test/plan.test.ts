import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyPlan, createPlan, rollbackPlan } from "../src/plan";

describe("safe transformation plans", () => {
  it("refuses stale source and supports rollback", () => {
    const root = mkdtempSync(path.join(tmpdir(), "arqen-transform-"));
    try {
      const file = path.join(root, "styles.css");
      writeFileSync(file, "body { margin: 0; }\n");
      const before = readFileSync(file, "utf8");
      const plan = createPlan([{ path: "styles.css", before, after: "body { margin: 1rem; }\n", reason: "test", expectedOutcome: "change one declaration", risk: "low", confidence: 1, validationStrategy: ["re-audit"] }], false);
      expect(plan.edits[0].validationStrategy).toEqual(["re-audit"]);
      expect(applyPlan(root, plan).applied).toEqual(["styles.css"]);
      expect(readFileSync(file, "utf8")).toContain("1rem");
      expect(rollbackPlan(root, plan)).toEqual(["styles.css"]);
      expect(readFileSync(file, "utf8")).toBe(before);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("does not modify files in dry-run mode", () => {
    const root = mkdtempSync(path.join(tmpdir(), "arqen-transform-dry-run-"));
    try {
      const file = path.join(root, "styles.css");
      writeFileSync(file, "body { margin: 0; }\n");
      const plan = createPlan([{ path: "styles.css", before: readFileSync(file, "utf8"), after: "body { margin: 2rem; }\n", reason: "test", expectedOutcome: "dry-run only", risk: "low", confidence: 1, validationStrategy: ["inspect diff"] }], true);
      expect(applyPlan(root, plan).applied).toEqual([]);
      expect(readFileSync(file, "utf8")).toBe("body { margin: 0; }\n");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
