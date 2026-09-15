import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { Component, DesignSystem, Project, SourceFile } from "@arqen/core";

const IGNORED = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".vercel"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".sass"]);
const UI_EXTENSIONS = new Set([".tsx", ".jsx", ".ts", ".js"]);

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

function isComponentName(name: string): boolean { return /^[A-Z]/.test(name); }
function hasExportModifier(node: ts.Node): boolean { return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false; }
function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) current = current.expression;
  return current;
}
function isFunctionLike(node: ts.Expression): boolean { return ts.isArrowFunction(node) || ts.isFunctionExpression(node); }

function jsxElementsFor(node: ts.Node, source: ts.SourceFile): string[] {
  const elements: string[] = [];
  const collect = (child: ts.Node) => {
    if (ts.isJsxElement(child)) elements.push(child.openingElement.tagName.getText(source));
    if (ts.isJsxSelfClosingElement(child)) elements.push(child.tagName.getText(source));
    ts.forEachChild(child, collect);
  };
  collect(node);
  return [...new Set(elements)];
}

function propsFor(node: ts.FunctionLikeDeclarationBase, source: ts.SourceFile): string[] {
  return node.parameters.flatMap((parameter) => {
    if (ts.isObjectBindingPattern(parameter.name)) return parameter.name.elements.map((element) => element.name.getText(source));
    return [parameter.name.getText(source)];
  });
}

function componentFromFunction(root: string, file: string, source: ts.SourceFile, name: string, node: ts.FunctionLikeDeclarationBase, kind: Component["kind"], exported: boolean): Component {
  return {
    id: `${path.relative(root, file)}:${name}`,
    name,
    file: path.relative(root, file),
    kind,
    exported,
    jsxElements: jsxElementsFor(node, source),
    props: propsFor(node, source),
    sourceLines: source.text.slice(0, node.end).split("\n").length,
  };
}

function parseComponents(root: string, files: string[]): Component[] {
  const components: Component[] = [];
  for (const file of files.filter((item) => UI_EXTENSIONS.has(path.extname(item)))) {
    const text = fs.readFileSync(file, "utf8");
    const isTsx = [".tsx", ".jsx"].includes(path.extname(file));
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const addFunction = (name: string, node: ts.FunctionLikeDeclarationBase, kind: Component["kind"], exported: boolean) => {
      if (isComponentName(name)) components.push(componentFromFunction(root, file, source, name, node, kind, exported));
    };
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        if (node.name) addFunction(node.name.text, node, "function", hasExportModifier(node));
        else if (node.parent && ts.isSourceFile(node.parent) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) addFunction("default", node, "function", true);
      }
      if (ts.isClassDeclaration(node) && node.name && isComponentName(node.name.text)) {
        const heritage = node.heritageClauses?.some((clause) => /(?:React\.)?Component|PureComponent/.test(clause.getText(source))) ?? false;
        if (heritage) components.push({ id: `${path.relative(root, file)}:${node.name.text}`, name: node.name.text, file: path.relative(root, file), kind: "class", exported: hasExportModifier(node), jsxElements: jsxElementsFor(node, source), props: [], sourceLines: source.text.slice(0, node.end).split("\n").length });
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        const initializer = node.initializer ? unwrapExpression(node.initializer) : undefined;
        if (initializer && isFunctionLike(initializer)) addFunction(name, initializer, "function", hasExportModifier(node.parent.parent));
        else if (initializer && ts.isCallExpression(initializer) && initializer.arguments.length > 0) {
          const wrapped = initializer.arguments.find((argument) => isFunctionLike(unwrapExpression(argument)));
          if (wrapped) {
            const expression = unwrapExpression(wrapped);
            if (isFunctionLike(expression)) addFunction(name, expression, "function", hasExportModifier(node.parent.parent));
          }
        }
      }
      if (ts.isExportAssignment(node) && node.expression) {
        const expression = unwrapExpression(node.expression);
        if (isFunctionLike(expression)) addFunction("default", expression, "function", true);
        else if (ts.isCallExpression(expression)) {
          const wrapped = expression.arguments.find((argument) => isFunctionLike(unwrapExpression(argument)));
          if (wrapped) {
            const inner = unwrapExpression(wrapped);
            if (isFunctionLike(inner)) addFunction("default", inner, "function", true);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return components;
}

function tokenCategory(name: string, value: string): DesignSystem["tokens"][number]["category"] {
  if (/color|background|border|fill|text/i.test(name) || /^#|^rgb|^hsl|^oklch|^var\(/i.test(value)) return "color";
  if (/space|gap|padding|margin/i.test(name)) return "spacing";
  if (/radius/i.test(name)) return "radius";
  if (/shadow/i.test(name)) return "shadow";
  if (/font|line|weight/i.test(name)) return "typography";
  if (/breakpoint|screen/i.test(name)) return "breakpoint";
  return "other";
}

function extractDesignSystem(root: string, files: string[]): DesignSystem {
  const tokens: DesignSystem["tokens"] = [];
  const valueCounts = new Map<string, { category: DesignSystem["tokens"][number]["category"]; count: number }>();
  const componentCounts = new Map<string, { count: number; files: Set<string> }>();
  for (const file of files.filter((item) => /\.(css|scss|sass|tsx|jsx|ts|js)$/.test(item))) {
    const text = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    if (/\.(css|scss|sass)$/.test(file)) {
      for (const match of text.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
        const name = `--${match[1]}`;
        const value = match[2].trim();
        const category = tokenCategory(name, value);
        tokens.push({ name, category, value, source: relative });
        const current = valueCounts.get(value) ?? { category, count: 0 };
        current.count += 1;
        valueCounts.set(value, current);
      }
      for (const match of text.matchAll(/(?:color|background(?:-color)?|border(?:-color)?|box-shadow|border-radius|font-size|font-weight|line-height)\s*:\s*([^;{}]+);/gi)) {
        const value = match[1].trim();
        if (!value || value.startsWith("var(")) continue;
        const category = tokenCategory(match[0], value);
        const current = valueCounts.get(value) ?? { category, count: 0 };
        current.count += 1;
        valueCounts.set(value, current);
      }
    }
    for (const match of text.matchAll(/<([A-Z][A-Za-z0-9_.]*)\b/g)) {
      const name = match[1];
      const current = componentCounts.get(name) ?? { count: 0, files: new Set<string>() };
      current.count += 1;
      current.files.add(relative);
      componentCounts.set(name, current);
    }
  }
  const repeatedValues = [...valueCounts.entries()]
    .filter(([, item]) => item.count > 1)
    .map(([value, item]) => ({ value, count: item.count, category: item.category }));
  const componentPatterns = [...componentCounts.entries()]
    .filter(([, item]) => item.count >= 2)
    .map(([name, item]) => ({ name, count: item.count, files: [...item.files] }));
  return { tokens, repeatedValues, componentPatterns };
}

export function analyzeProject(root: string): Project {
  const resolvedRoot = path.resolve(root);
  const packageJson = readJson(resolvedRoot, "package.json");
  const rawFiles = walk(resolvedRoot);
  const files: SourceFile[] = rawFiles.map((file) => ({ path: path.relative(resolvedRoot, file), extension: path.extname(file), bytes: fs.statSync(file).size, language: /\.tsx?$/.test(file) ? "typescript" : /\.jsx?$/.test(file) ? "javascript" : "mixed" }));
  const language: Project["language"] = files.some((file) => file.extension === ".tsx" || file.extension === ".ts") && files.some((file) => file.extension === ".jsx" || file.extension === ".js") ? "mixed" : files.some((file) => /\.tsx?$/.test(file.extension)) ? "typescript" : files.some((file) => /\.jsx?$/.test(file.extension)) ? "javascript" : "unknown";
  const framework = detectFramework(resolvedRoot, packageJson);
  const components = parseComponents(resolvedRoot, rawFiles);
  const designSystem = extractDesignSystem(resolvedRoot, rawFiles);
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
