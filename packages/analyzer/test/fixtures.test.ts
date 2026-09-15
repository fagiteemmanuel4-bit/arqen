import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject } from "../src/project.js";
import { auditProject } from "../src/audit.js";

const root = path.resolve(process.cwd(), "fixtures");
const fixtures = [
  "poor-saas-dashboard",
  "poor-landing-page",
  "poor-movie-site",
  "reasonably-designed-app",
  "responsive-failure",
  "accessibility-failure",
  "duplicated-components",
  "inconsistent-token",
  "tailwind-heavy",
  "css-heavy",
];

describe("fixture regression suite", () => {
  for (const name of fixtures) {
    it(`analyzes ${name} without throwing`, () => {
      const project = analyzeProject(path.join(root, name));
      expect(project.files.length).toBeGreaterThan(0);
      expect(project.components.length).toBeGreaterThan(0);
      expect(auditProject(project).score).toBeGreaterThanOrEqual(0);
    });
  }

  it("detects the committed movie-site regression signals", () => {
    const fixtureRoot = path.join(root, "movie-site-fixture");
    const expected = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "expected-findings.json"), "utf8")) as { mustDetect: string[]; mustNotClaim: string[] };
    const result = auditProject(analyzeProject(fixtureRoot));
    const rules = result.findings.map((finding) => finding.rule);
    expect(expected.mustDetect.every((rule) => rules.includes(rule))).toBe(true);
    const serialized = JSON.stringify(result);
    for (const forbidden of expected.mustNotClaim) expect(serialized).not.toContain(forbidden);
  });
});
