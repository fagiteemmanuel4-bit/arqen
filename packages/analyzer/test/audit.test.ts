import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject } from "../src/project.js";
import { auditProject } from "../src/audit.js";

function fixture(source: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "arqen-audit-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "latest" } }));
  fs.writeFileSync(path.join(root, "src", "App.tsx"), source);
  return root;
}

describe("auditProject", () => {
  it("reports certain accessibility failures without pretending to observe a browser", () => {
    const root = fixture(`
      export const App = () => <main>
        <button><span aria-hidden="true">+</span></button>
        <img src="/poster.png" />
        <input placeholder="Search" />
        <a href="/details">Learn more</a>
      </main>;
    `);
    const result = auditProject(analyzeProject(root));
    expect(result.findings.map((finding) => finding.rule)).toEqual(expect.arrayContaining([
      "accessibility.image-alt", "accessibility.button-names", "accessibility.form-names", "accessibility.weak-link-names",
    ]));
    expect(result.findings.find((finding) => finding.rule === "accessibility.button-names")?.certainty).toBe("CERTAIN");
  });

  it("reports static responsive risk as a possibility rather than an observed failure", () => {
    const root = fixture(`
      export const App = () => <main><div className="w-[900px] flex overflow-hidden"><aside /><section /></div><div className="w-[760px]" /></main>;
    `);
    const result = auditProject(analyzeProject(root));
    const finding = result.findings.find((item) => item.rule === "responsive.fixed-width-risk");
    expect(finding).toBeDefined();
    expect(finding?.evidence).toContain("Static analysis cannot observe actual viewport overflow");
    expect(finding?.certainty).toBe("LIKELY");
  });

  it("does not emit the forbidden AI-generated design label", () => {
    const root = fixture("export const App = () => <main className=\"rounded-xl shadow-lg bg-gradient-to-r\" />;");
    const result = auditProject(analyzeProject(root));
    expect(JSON.stringify(result)).not.toMatch(/AI-generated/i);
  });
});
