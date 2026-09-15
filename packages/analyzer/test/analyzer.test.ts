import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, auditProject } from "../src/index";

describe("project analyzer", () => {
  it("detects React structure and component AST nodes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "arqen-"));
    try {
      writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "latest" } }));
      writeFileSync(path.join(root, "src.tsx"), "export function Dashboard() { return <main><button>Save</button></main>; }");
      const project = analyzeProject(root);
      expect(project.framework).toBe("react");
      expect(project.components.some((component) => component.name === "Dashboard")).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("emits evidence-based audit findings", () => {
    const root = mkdtempSync(path.join(tmpdir(), "arqen-"));
    try {
      writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "latest" } }));
      writeFileSync(path.join(root, "src.tsx"), "export function App(){return <><img src='x'/><input/><div className='rounded-xl shadow-lg'/></>}");
      const result = auditProject(analyzeProject(root));
      expect(result.findings.some((finding) => finding.rule === "a11y.image-alt")).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
