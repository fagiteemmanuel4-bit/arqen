import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, auditProject } from "../src/index";

describe("golden movie fixture", () => {
  it("matches semantic expectations without brittle model wording", () => {
    const root = path.resolve(process.cwd(), "fixtures/movie-site-fixture");
    const expected = JSON.parse(fs.readFileSync(path.join(root, "expected.json"), "utf8"));
    const project = analyzeProject(root);
    const audit = auditProject(project);
    const rules = new Map(audit.findings.map((finding) => [finding.rule, finding]));

    for (const expectation of expected.static.findings) {
      const finding = rules.get(expectation.rule);
      expect(finding, `expected ${expectation.rule}`).toBeDefined();
      expect(expectation.category).toContain(finding?.category);
      expect(expectation.severity).toContain(finding?.severity);
      expect(expectation.certainty).toContain(finding?.certainty);
      expect(expectation.evidence).toBe("source");
    }

    expect(project.components.length).toBeGreaterThan(0);
    expect(project.designSystem.repeatedValues.length).toBeGreaterThan(0);
    expect(project.designSystem.componentPatterns.length).toBeGreaterThan(0);
    expect(audit.findings.every((finding) => !/observed|browser|visual-score|AI-generated/i.test(finding.evidence))).toBe(true);
  });
});
