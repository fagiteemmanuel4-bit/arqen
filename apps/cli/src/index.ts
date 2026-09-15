#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { analyzeProject, auditProject } from "@arqen/analyzer";
import { isValidUIIR, validateUIIR } from "@arqen/uiir";
import { applyPlan, buildSafeAuditPlan } from "@arqen/transform";

const program = new Command();
program.name("arqen").description("Design intelligence for existing software").version("0.2.0");

function projectPath(input?: string) { return path.resolve(input ?? "."); }
function print(value: unknown, json: boolean) { console.log(json ? JSON.stringify(value, null, 2) : value); }

program.command("init").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory);
  const dir = path.join(root, ".arqen");
  fs.mkdirSync(dir, { recursive: true });
  const config = { version: 1, projectRoot: ".", analysis: { ignored: ["node_modules", ".git", ".next", "dist", "build", "coverage"] } };
  fs.writeFileSync(path.join(dir, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
  print({ initialized: true, path: path.relative(process.cwd(), dir) || ".arqen" }, options.json);
});

program.command("analyze").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const project = analyzeProject(projectPath(directory));
  const result = { name: project.name, framework: project.framework, language: project.language, packageManager: project.packageManager, styling: project.styling, files: project.files.length, entryPoints: project.entryPoints, routes: project.routes, components: project.components.length, designTokens: project.designSystem.tokens.length };
  if (options.json) print(result, true);
  else {
    console.log(`\n${project.name} · ${project.framework}`);
    console.log(`  language       ${project.language}`);
    console.log(`  package manager ${project.packageManager}`);
    console.log(`  styling         ${project.styling}`);
    console.log(`  source files    ${project.files.length}`);
    console.log(`  routes          ${project.routes.length}`);
    console.log(`  components      ${project.components.length}`);
    console.log(`  design tokens   ${project.designSystem.tokens.length}`);
    if (project.routes.length) console.log(`\nRoutes\n${project.routes.map((route) => `  ${route.path.padEnd(28)} ${route.file}`).join("\n")}`);
  }
});

program.command("audit").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const result = auditProject(analyzeProject(projectPath(directory)));
  if (options.json) print(result, true);
  else {
    console.log(`\nARQEN design audit · ${result.score}/100`);
    console.log(`  critical ${result.summary.critical}  high ${result.summary.high}  medium ${result.summary.medium}  low ${result.summary.low}`);
    for (const finding of result.findings) console.log(`\n[${finding.severity.toUpperCase()}] ${finding.title}\n  ${finding.evidence}\n  → ${finding.recommendation}`);
  }
});

program.command("review").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action(async (directory, options) => {
  const result = auditProject(analyzeProject(projectPath(directory)));
  print({ kind: "design-review", ...result }, options.json);
});

program.command("fix").argument("[directory]", "project directory", ".").option("--apply", "apply the safe plan").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory);
  const project = analyzeProject(root);
  const audit = auditProject(project);
  const plan = buildSafeAuditPlan(project, audit);
  if (options.apply) plan.dryRun = false;
  const result = options.apply ? applyPlan(root, plan) : { applied: [], skipped: plan.edits.map((edit) => edit.path) };
  print({ plan, result }, options.json);
});

program.command("diff").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const project = analyzeProject(projectPath(directory));
  const plan = buildSafeAuditPlan(project, auditProject(project));
  const result = plan.edits.map((edit) => ({ path: edit.path, reason: edit.reason, risk: edit.risk, before: edit.before, after: edit.after }));
  print(result, options.json);
});

program.command("validate").argument("file", "UIIR JSON file").option("--json", "machine-readable output").action((file, options) => {
  const document = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  const issues = validateUIIR(document);
  print({ valid: isValidUIIR(document), issues }, options.json);
  if (issues.some((issue) => issue.severity === "error")) process.exitCode = 1;
});

program.parse();
