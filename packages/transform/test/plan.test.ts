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
      const plan = createPlan([{ path: "styles.css", before, after: "body { margin: 1rem; }\n", reason: "test", risk: "low" }], false);
      expect(applyPlan(root, plan).applied).toEqual(["styles.css"]);
      expect(readFileSync(file, "utf8")).toContain("1rem");
      expect(rollbackPlan(root, plan)).toEqual(["styles.css"]);
      expect(readFileSync(file, "utf8")).toBe(before);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
