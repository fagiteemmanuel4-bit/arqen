#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { Command } from "commander";
import { analyzeProject, analyzeProjectGraph, auditProject } from "@arqen/analyzer";
import { inspectLocalFixture, inspectServer, type BrowserInspectionReport } from "@arqen/browser";
import { runInSandbox } from "@arqen/sandbox";
import { isValidUIIR, validateUIIR } from "@arqen/uiir";
import { applyPlan, buildSafeAuditPlan } from "@arqen/transform";

const program = new Command();
program.name("arqen").description("Design intelligence for existing software").version("0.2.0");

class ArqenError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly suggestion?: string,
    options?: ErrorOptions,
  ) { super(message, options); this.name = "ArqenError"; }
}

function projectPath(input?: string) { return path.resolve(input ?? "."); }
function print(value: unknown, json: boolean) { console.log(json ? JSON.stringify(value, null, 2) : value); }
function requireDirectory(root: string) {
  try { if (!fs.statSync(root).isDirectory()) throw new Error("not a directory"); }
  catch (error) { throw new ArqenError("INVALID_PROJECT", `Project directory is not accessible: ${root}`, { path: root }, "Pass a project directory that exists and is readable.", { cause: error }); }
}
function summarizeBrowser(report: BrowserInspectionReport) {
  const evidence = report.evidence.map((item) => ({
    viewport: item.viewport,
    screenshot: item.screenshot,
    overflow: item.overflow,
    accessibilityViolations: item.accessibility.violations,
    consoleErrors: item.consoleErrors,
    failedRequests: item.failedRequests,
  }));
  return {
    target: report.target,
    evidence,
    checks: {
      allViewportsLoaded: report.evidence.length === 3,
      horizontalOverflowFree: report.evidence.every((item) => !item.overflow.horizontal),
      accessibilityClean: report.evidence.every((item) => item.accessibility.violations.length === 0),
      consoleClean: report.evidence.every((item) => item.consoleErrors.length === 0),
      requestsClean: report.evidence.every((item) => item.failedRequests.length === 0),
    },
  };
}
function browserIsClean(report: BrowserInspectionReport) {
  const summary = summarizeBrowser(report);
  return Object.values(summary.checks).every(Boolean);
}
function throwBrowserFailure(summary: ReturnType<typeof summarizeBrowser>) {
  throw new ArqenError(
    "RUNTIME_VALIDATION_FAILED",
    "Runtime inspection found one or more failing checks.",
    summary,
    "Open the JSON report and fix the reported viewport, accessibility, console, or network findings before treating the change as validated.",
  );
}

program.command("init").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory); const dir = path.join(root, ".arqen"); fs.mkdirSync(dir, { recursive: true });
  const config = { version: 1, projectRoot: ".", analysis: { ignored: ["node_modules", ".git", ".next", "dist", "build", "coverage"] } };
  fs.writeFileSync(path.join(dir, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
  print({ initialized: true, path: path.relative(process.cwd(), dir) || ".arqen" }, options.json);
});

program.command("analyze").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory); requireDirectory(root);
  const project = analyzeProject(root); const graph = analyzeProjectGraph(project);
  const result = { name: project.name, framework: project.framework, language: project.language, packageManager: project.packageManager, styling: project.styling, files: project.files.length, entryPoints: project.entryPoints, routes: project.routes, components: project.components, designTokens: project.designSystem.tokens, repeatedValues: project.designSystem.repeatedValues, componentPatterns: project.designSystem.componentPatterns, graph };
  if (options.json) print(result, true); else {
    console.log(`\n${project.name} · ${project.framework}`); console.log(`  language        ${project.language}`); console.log(`  package manager ${project.packageManager}`); console.log(`  styling         ${project.styling}`);
    console.log(`  source files    ${project.files.length}`); console.log(`  routes          ${project.routes.length}`); console.log(`  components      ${project.components.length}`); console.log(`  design tokens   ${project.designSystem.tokens.length}`); console.log(`  graph nodes     ${graph.nodes.length}`);
    if (project.routes.length) console.log(`\nRoutes\n${project.routes.map((route) => `  ${route.path.padEnd(28)} ${route.file}`).join("\n")}`);
  }
});

program.command("audit").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory); requireDirectory(root); const result = auditProject(analyzeProject(root));
  if (options.json) print(result, true); else {
    console.log(`\nARQEN design audit · ${result.score}/100`); console.log(`  critical ${result.summary.critical}  high ${result.summary.high}  medium ${result.summary.medium}  low ${result.summary.low}`);
    for (const finding of result.findings) console.log(`\n[${finding.severity.toUpperCase()} · ${finding.certainty} · ${(finding.confidence * 100).toFixed(0)}% confidence] ${finding.title}\n  ${finding.evidence}\n  → ${finding.recommendation}`);
  }
});

program.command("inspect")
  .argument("[directory]", "project directory", ".")
  .option("--file <path>", "HTML entry file for a local fixture")
  .option("--serve", "run the project in the sandbox and inspect its localhost server")
  .option("--serve-command <command>", "sandbox dev-server command")
  .option("--json", "machine-readable output")
  .option("--strict", "exit non-zero when runtime evidence is not clean")
  .action(async (directory, options) => {
    const root = projectPath(directory); requireDirectory(root);
    const outputDir = path.join(root, ".arqen", "inspect", String(Date.now()));
    fs.mkdirSync(outputDir, { recursive: true });
    let report: BrowserInspectionReport;
    let runtimeStop: (() => Promise<void>) | undefined;
    try {
      const localEntry = options.file ? path.resolve(root, options.file) : path.join(root, "index.html");
      if (!options.serve && fs.existsSync(localEntry)) {
        report = await inspectLocalFixture({ target: pathToFileURL(localEntry).toString(), allowedRoot: root, outputDir });
      } else {
        const sandbox = await runInSandbox(root, { serveCommand: options.serveCommand });
        if (!sandbox.ok) throw new ArqenError(`SANDBOX_${sandbox.error.code}`, sandbox.error.message, sandbox.error, "Fix the sandbox/project startup error and retry.");
        runtimeStop = sandbox.runtime.stop;
        report = await inspectServer({ target: sandbox.runtime.url, outputDir });
      }
    } finally {
      if (runtimeStop) await runtimeStop().catch(() => undefined);
    }
    const summary = summarizeBrowser(report);
    const result = { kind: "runtime-inspection", ...summary, outputDir };
    print(result, options.json);
    if (options.strict && !browserIsClean(report)) throwBrowserFailure(summary);
  });

program.command("review").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory); requireDirectory(root); let diff = "";
  try { diff = execFileSync("git", ["diff", "--unified=0", "HEAD", "--", "."], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { diff = ""; }
  const changedFiles = [...diff.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].map((match) => match[2]!).filter((file) => /\.(tsx|jsx|ts|js|css|scss|sass)$/.test(file));
  const project = analyzeProject(root); const audit = auditProject(project); const changed = new Set(changedFiles);
  const regressions = audit.findings.filter((finding) => finding.files.some((file) => changed.has(file)));
  const result = { kind: "design-review", changedFiles, changedUiFiles: changedFiles.filter((file) => /\.(tsx|jsx)$/.test(file)), regressions, audit: { score: audit.score, summary: audit.summary } };
  if (options.json) print(result, true); else {
    console.log(`\nARQEN REVIEW · ${changedFiles.length} changed UI/style files`); if (!regressions.length) console.log("No deterministic findings were attributable to changed files.");
    for (const finding of regressions) console.log(`\n[${finding.severity.toUpperCase()} · ${finding.certainty}] ${finding.title}\n  ${finding.evidence}\n  Files: ${finding.files.join(", ")}\n  → ${finding.recommendation}`);
  }
});

program.command("fix").argument("[directory]", "project directory", ".").option("--apply", "apply the safe plan").option("--runtime", "run runtime inspection after applying").option("--json", "machine-readable output").action(async (directory, options) => {
  const root = projectPath(directory); requireDirectory(root); const project = analyzeProject(root); const beforeAudit = auditProject(project); const plan = buildSafeAuditPlan(project, beforeAudit);
  if (!options.apply) { print({ plan, result: { applied: [], skipped: plan.edits.map((edit) => edit.path) } }, options.json); return; }
  plan.dryRun = false;
  const result = applyPlan(root, plan);
  const afterProject = analyzeProject(root); const afterAudit = auditProject(afterProject);
  if (afterAudit.score < beforeAudit.score) throw new ArqenError("TRANSFORMATION_REGRESSION", `Transformation reduced the audit score from ${beforeAudit.score} to ${afterAudit.score}.`, { before: beforeAudit.score, after: afterAudit.score }, "Revert the change and inspect the generated plan before applying it again.");
  let runtime: ReturnType<typeof summarizeBrowser> | undefined;
  if (options.runtime) {
    const localEntry = path.join(root, "index.html");
    if (!fs.existsSync(localEntry)) throw new ArqenError("RUNTIME_ENTRY_MISSING", "--runtime requires index.html or a served project; this project has no index.html.", undefined, "Run `arqen inspect --serve` for a project that needs sandbox startup.");
    const outputDir = path.join(root, ".arqen", "inspect", String(Date.now()));
    const report = await inspectLocalFixture({ target: pathToFileURL(localEntry).toString(), allowedRoot: root, outputDir });
    runtime = summarizeBrowser(report); if (!browserIsClean(report)) throwBrowserFailure(runtime);
  }
  print({ plan, result, validation: { beforeScore: beforeAudit.score, afterScore: afterAudit.score, auditImprovedOrStable: afterAudit.score >= beforeAudit.score, runtime } }, options.json);
});

program.command("diff").argument("[directory]", "project directory", ".").option("--json", "machine-readable output").action((directory, options) => {
  const root = projectPath(directory); requireDirectory(root); const project = analyzeProject(root); const plan = buildSafeAuditPlan(project, auditProject(project));
  print(plan.edits.map((edit) => ({ path: edit.path, reason: edit.reason, expectedOutcome: edit.expectedOutcome, risk: edit.risk, confidence: edit.confidence, validationStrategy: edit.validationStrategy, before: edit.before, after: edit.after })), options.json);
});

program.command("validate").argument("target", "UIIR JSON file or project directory").option("--runtime", "run runtime inspection when validating a project").option("--json", "machine-readable output").action(async (target, options) => {
  const resolved = projectPath(target);
  try {
    if (fs.statSync(resolved).isFile()) {
      const document = JSON.parse(fs.readFileSync(resolved, "utf8")); const issues = validateUIIR(document);
      print({ kind: "uiir", valid: isValidUIIR(document), issues }, options.json);
      if (issues.some((issue) => issue.severity === "error")) process.exitCode = 1;
      return;
    }
  } catch (error) { throw new ArqenError("INVALID_TARGET", `Validation target is not readable: ${resolved}`, undefined, "Pass a UIIR JSON file or project directory.", { cause: error }); }
  requireDirectory(resolved);
  const project = analyzeProject(resolved); const audit = auditProject(project); const graph = analyzeProjectGraph(project); const plan = buildSafeAuditPlan(project, audit);
  let browser: ReturnType<typeof summarizeBrowser> | undefined;
  if (options.runtime) {
    const localEntry = path.join(resolved, "index.html");
    if (fs.existsSync(localEntry)) {
      const outputDir = path.join(resolved, ".arqen", "inspect", String(Date.now()));
      const report = await inspectLocalFixture({ target: pathToFileURL(localEntry).toString(), allowedRoot: resolved, outputDir }); browser = summarizeBrowser(report);
    }
  }
  const result = {
    kind: "project-validation",
    project: { name: project.name, framework: project.framework, files: project.files.length, components: project.components.length },
    checks: {
      parsed: project.files.length > 0,
      graphBuilt: graph.nodes.length > 0 || project.files.length === 0,
      auditCompleted: true,
      transformationPlanValid: plan.edits.every((edit) => edit.path && edit.before !== edit.after && edit.validationStrategy.length > 0),
      browser: browser ? browser.checks.allViewportsLoaded : "not-run",
      accessibility: browser ? browser.checks.accessibilityClean : "not-run",
      overflow: browser ? browser.checks.horizontalOverflowFree : "not-run",
      console: browser ? browser.checks.consoleClean : "not-run",
      requests: browser ? browser.checks.requestsClean : "not-run",
    },
    audit: { score: audit.score, summary: audit.summary, findings: audit.findings }, browser,
  };
  print(result, options.json);
  if (!result.checks.parsed || !result.checks.graphBuilt || !result.checks.transformationPlanValid || result.checks.browser === false || result.checks.accessibility === false || result.checks.overflow === false || result.checks.console === false || result.checks.requests === false) process.exitCode = 1;
});

async function main() {
  try { await program.parseAsync(process.argv); }
  catch (error) {
    const json = process.argv.includes("--json");
    const normalized = error instanceof ArqenError ? error : new ArqenError("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error), undefined, "Run the command again with --json for structured diagnostics.", { cause: error instanceof Error ? error : undefined });
    const payload = { error: { code: normalized.code, message: normalized.message, details: normalized.details, suggestion: normalized.suggestion } };
    if (json) console.error(JSON.stringify(payload, null, 2)); else { console.error(`\nARQEN ERROR [${normalized.code}] ${normalized.message}`); if (normalized.suggestion) console.error(`  → ${normalized.suggestion}`); }
    process.exitCode = 1;
  }
}

void main();
