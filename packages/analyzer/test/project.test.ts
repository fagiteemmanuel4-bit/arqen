import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject } from "../src/project.js";

function fixture(source: string, css = "") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "arqen-analyzer-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "latest" } }));
  fs.writeFileSync(path.join(root, "src", "App.tsx"), source);
  if (css) fs.writeFileSync(path.join(root, "src", "styles.css"), css);
  return root;
}

describe("analyzeProject", () => {
  it("detects function, arrow, function-expression, default, memo and forwardRef components", () => {
    const root = fixture(`
      import React, { forwardRef, memo } from "react";
      function FunctionComponent({ title }: { title: string }) { return <section>{title}</section>; }
      const ArrowComponent = ({ value }: { value: string }) => <div>{value}</div>;
      export const ExpressionComponent = function () { return <button>Save</button>; };
      export const MemoComponent = memo(() => <Card />);
      const RefComponent = forwardRef<HTMLDivElement>((props, ref) => <div ref={ref}>{props.children}</div>);
      export default () => <main><ArrowComponent value="x" /></main>;
    `);
    const project = analyzeProject(root);
    expect(project.components.map((component) => component.name)).toEqual(expect.arrayContaining([
      "FunctionComponent", "ArrowComponent", "ExpressionComponent", "MemoComponent", "RefComponent", "default",
    ]));
    expect(project.components.find((component) => component.name === "FunctionComponent")?.jsxElements).toContain("section");
  });

  it("detects class React components and component reuse patterns", () => {
    const root = fixture(`
      import React from "react";
      export class LegacyCard extends React.Component { render() { return <Card><Badge /></Card>; } }
      export const Screen = () => <div><Card /><Card /><Badge /></div>;
    `);
    const project = analyzeProject(root);
    expect(project.components.find((component) => component.name === "LegacyCard")?.kind).toBe("class");
    expect(project.designSystem.componentPatterns.map((pattern) => pattern.name)).toEqual(expect.arrayContaining(["Card"]));
  });

  it("extracts defined tokens separately from repeated raw CSS values", () => {
    const root = fixture("export const App = () => <main />;", `
      :root { --color-brand: #111111; --space-md: 16px; --radius-card: 12px; }
      .a { color: #111111; padding: 16px; }
      .b { color: #111111; margin: 16px; }
    `);
    const project = analyzeProject(root);
    expect(project.designSystem.tokens.map((token) => token.name)).toEqual(expect.arrayContaining(["--color-brand", "--space-md", "--radius-card"]));
    expect(project.designSystem.repeatedValues.some((item) => item.value === "#111111" && item.count >= 3)).toBe(true);
  });
});
