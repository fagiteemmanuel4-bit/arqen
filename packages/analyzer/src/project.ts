import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { Component, DesignSystem, Project, SourceFile } from "@arqen/core";

const IGNORED = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".vercel"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".sass"]);

function walk(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
    }
  };
  visit(root);
  return files;
}

function readJson(root: string, file: string): Record<string, unknown> | undefined {
  try { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); } catch { return undefined; }
}

function detectPackageManager(root: string): Project["packageManager"] {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(root, "package-lock.json"))) return "npm";
  return "unknown";
}

function detectFramework(root: string, pkg: Record<string, unknown> | undefined): Project["framework"] {
  const deps = { ...(pkg?.dependencies as object ?? {}), ...(pkg?.devDependencies as object ?? {}) } as Record<string, unknown>;
  if ("next" in deps || fs.existsSync(path.join(root, "next.config.js")) || fs.existsSync(path.join(root, "next.config.mjs"))) return "nextjs";
  if ("react" in deps) return fs.existsSync(path.join(root, "vite.config.ts")) || fs.existsSync(path.join(root, "vite.config.js")) ? "vite-react" : "react";
  return "unknown";
}

function detectStyling(root: string, sourceFiles: string[]): Project["styling"] {
  const pkg = readJson(root, "package.json");
  const deps = { ...(pkg?.dependencies as object ?? {}), ...(pkg?.devDependencies as object ?? {}) } as Record<string, unknown>;
  const hasTailwind = "tailwindcss" in deps || sourceFiles.some((file) => /@import ["']tailwindcss|@theme\s*\{/.test(fs.readFileSync(file, "utf8")));
  const hasModules = sourceFiles.some((file) => file.includes(".module.css") || file.includes(".module.scss"));
  const hasStyled = "styled-components" in deps;
  const hasEmotion = "@emotion/react" in deps || "@emotion/styled" in deps;
  const matches = [hasTailwind, hasModules, hasStyled, hasEmotion].filter(Boolean).length;
  if (matches > 1) return "mixed";
  if (hasTailwind) return "tailwind";
  if (hasModules) return "css-modules";
  if (hasStyled) return "styled-components";
  if (hasEmotion) return "emotion";
  if (sourceFiles.some((file) => [".css", ".scss", ".sass"].includes(path.extname(file)))) return "css";
  return "unknown";
}

function parseComponents(root: string, files: string[]): Component[] {
  const components: Component[] = [];
  for (const file of files.filter((item) => [".tsx", ".jsx", ".ts", ".js"].includes(path.extname(item)))) {
    const text = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, [".tsx", ".jsx"].includes(path.extname(file)) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
        const body = node.body?.getText(source) ?? "";
        const jsxElements: string[] = [];
        const collect = (child: ts.Node) => {
          if (ts.isJsxElement(child)) jsxElements.push(child.openingElement.tagName.getText(source));
          if (ts.isJsxSelfClosingElement(child)) jsxElements.push(child.tagName.getText(source));
          ts.forEachChild(child, collect);
        };
        collect(node);
        components.push({ id: `${path.relative(root, file)}:${node.name.text}`, name: node.name.text, file: path.relative(root, file), kind: "function", exported: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false, jsxElements: [...new Set(jsxElements)], props: node.parameters.flatMap((parameter) => parameter.name.getText(source)), sourceLines: text.slice(0, node.end).split("\n").length });
        void body;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return components;
}

function extractDesignSystem(files: string[]): DesignSystem {
  const tokens: DesignSystem["tokens"] = [];
  const valueCounts = new Map<string, { category: DesignSystem["tokens"][number]["category"]; count: number }>();
  for (const file of files.filter((item) => /\.(css|scss|sass)$/.test(item))) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
      const name = `--${match[1]}`;
      const value = match[2].trim();
      const category = /color|background|border|fill|text/i.test(name) || /^#|^rgb|^hsl|^oklch/i.test(value) ? "color" : /space|gap|padding|margin/i.test(name) ? "spacing" : /radius/i.test(name) ? "radius" : /shadow/i.test(name) ? "shadow" : /font|line|weight/i.test(name) ? "typography" : /breakpoint|screen/i.test(name) ? "breakpoint" : "other";
      tokens.push({ name, category, value, source: path.basename(file) });
      const current = valueCounts.get(value) ?? { category, count: 0 };
      current.count += 1;
      valueCounts.set(value, current);
    }
  }
  const repeatedValues = [...valueCounts.entries()].filter(([, item]) => item.count > 1).map(([value, item]) => ({ value, count: item.count, category: item.category }));
  return { tokens, repeatedValues, componentPatterns: [] };
}

export function analyzeProject(root: string): Project {
  const resolvedRoot = path.resolve(root);
  const packageJson = readJson(resolvedRoot, "package.json");
  const rawFiles = walk(resolvedRoot);
  const files: SourceFile[] = rawFiles.map((file) => ({ path: path.relative(resolvedRoot, file), extension: path.extname(file), bytes: fs.statSync(file).size, language: /\.tsx?$/.test(file) ? "typescript" : /\.jsx?$/.test(file) ? "javascript" : "mixed" }));
  const language: Project["language"] = files.some((file) => file.extension === ".tsx" || file.extension === ".ts") && files.some((file) => file.extension === ".jsx" || file.extension === ".js") ? "mixed" : files.some((file) => /\.tsx?$/.test(file.extension)) ? "typescript" : files.some((file) => /\.jsx?$/.test(file.extension)) ? "javascript" : "unknown";
  const framework = detectFramework(resolvedRoot, packageJson);
  const components = parseComponents(resolvedRoot, rawFiles);
  const designSystem = extractDesignSystem(rawFiles);
  const routes = rawFiles.filter((file) => /(^|\/)(page|route)\.(tsx|ts|jsx|js)$/.test(file) || /pages\/.*\.(tsx|ts|jsx|js)$/.test(file)).map((file) => ({ path: routeForFile(resolvedRoot, file), file: path.relative(resolvedRoot, file), kind: /route\./.test(file) ? "api" as const : "page" as const }));
  const pkgName = typeof packageJson?.name === "string" ? packageJson.name : path.basename(resolvedRoot);
  return { root: resolvedRoot, name: pkgName, framework, language, packageManager: detectPackageManager(resolvedRoot), styling: detectStyling(resolvedRoot, rawFiles), files, entryPoints: findEntryPoints(resolvedRoot, rawFiles), routes, components, designSystem };
}

function routeForFile(root: string, file: string): string {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (relative.includes("app/")) {
    const route = relative.split("app/")[1].replace(/\/(page|route)\.(tsx|ts|jsx|js)$/, "").replace(/\/(layout)\.(tsx|ts|jsx|js)$/, "");
    return `/${route === "" ? "" : route}`.replace(/\/$/, "") || "/";
  }
  const route = relative.split("pages/")[1]?.replace(/\.(tsx|ts|jsx|js)$/, "").replace(/\/index$/, "") ?? "/";
  return `/${route}`.replace(/\/$/, "") || "/";
}

function findEntryPoints(root: string, files: string[]): string[] {
  const names = ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "app/layout.tsx", "pages/_app.tsx", "src/App.tsx", "src/App.jsx"];
  return names.filter((name) => files.includes(path.join(root, name))).map((name) => name);
}
