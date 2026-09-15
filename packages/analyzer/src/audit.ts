import fs from "node:fs";
import path from "node:path";
import type { Project } from "@arqen/core";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingCategory = "hierarchy" | "spacing" | "typography" | "color" | "density" | "consistency" | "responsive" | "accessibility" | "interaction" | "navigation" | "decoration" | "component_architecture" | "design_system";
export type FindingRisk = "low" | "medium" | "high";

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number;
  risk: FindingRisk;
  title: string;
  evidence: string;
  recommendation: string;
  potentialFix?: string;
  files: string[];
  rule: string;
}

export interface AuditResult {
  score: number;
  scoreModel: { base: number; penalties: Record<FindingSeverity, number>; explanation: string };
  findings: Finding[];
  summary: { critical: number; high: number; medium: number; low: number; info: number };
}

const UI_EXTENSIONS = /\.(tsx|jsx|ts|js)$/;
const severityPenalty: Record<FindingSeverity, number> = { critical: 20, high: 12, medium: 7, low: 3, info: 0 };

function uiFiles(project: Project): string[] { return project.files.filter((file) => UI_EXTENSIONS.test(file.extension)).map((file) => path.join(project.root, file.path)); }
function relativeFiles(project: Project, predicate?: (file: Project["files"][number]) => boolean): string[] { return project.files.filter((file) => UI_EXTENSIONS.test(file.extension) && (!predicate || predicate(file))).map((file) => file.path); }
function add(findings: Finding[], finding: Omit<Finding, "id">) { findings.push({ ...finding, id: `${finding.rule}:${findings.length + 1}` }); }
function confidence(value: number) { return Math.max(0, Math.min(1, value)); }

export function auditProject(project: Project): AuditResult {
  const findings: Finding[] = [];
  const files = uiFiles(project);
  let allSource = "";
  for (const file of files) { try { allSource += `\n${fs.readFileSync(file, "utf8")}`; } catch { /* snapshot may change */ } }

  const rounded = (allSource.match(/rounded-(?:lg|xl|2xl|3xl|full)/g) ?? []).length + (allSource.match(/border-radius\s*:/g) ?? []).length;
  if (rounded >= 12) add(findings, { category: "decoration", severity: "medium", confidence: confidence(Math.min(0.96, 0.55 + rounded / 100)), risk: "low", title: "High concentration of rounded containers", evidence: `${rounded} rounded-container declarations or utilities were detected.`, recommendation: "Reserve larger radii for controls or intentional surfaces; use a smaller structural radius scale where appropriate.", potentialFix: "Review the largest repeated radii and replace only redundant structural uses with existing tokens.", files: relativeFiles(project), rule: "decoration.rounded-containers" });

  const gradients = (allSource.match(/(?:bg-gradient|linear-gradient|radial-gradient)/g) ?? []).length;
  if (gradients >= 3) add(findings, { category: "decoration", severity: "low", confidence: 0.78, risk: "low", title: "Repeated decorative gradients", evidence: `${gradients} gradient declarations were found.`, recommendation: "Keep gradients that communicate identity or state; remove decorative gradients only when they dilute hierarchy.", files: relativeFiles(project), rule: "decoration.gradients" });

  const shadows = (allSource.match(/(?:shadow-(?:sm|md|lg|xl|2xl)|box-shadow\s*:)/g) ?? []).length;
  if (shadows >= 10) add(findings, { category: "decoration", severity: "low", confidence: 0.82, risk: "low", title: "Shadow density may dilute hierarchy", evidence: `${shadows} shadow declarations were found.`, recommendation: "Define a small elevation scale and reserve stronger shadows for overlays and meaningful separation.", files: relativeFiles(project), rule: "decoration.shadow-density" });

  const arbitrarySpacing = [...allSource.matchAll(/(?:p|m|gap|space-[xy])-\[(\d+(?:\.\d+)?)(?:px|rem)\]/g)];
  if (arbitrarySpacing.length >= 5) add(findings, { category: "spacing", severity: "medium", confidence: 0.9, risk: "medium", title: "Many one-off spacing values", evidence: `${arbitrarySpacing.length} arbitrary spacing utilities were detected.`, recommendation: "Prefer the project's existing spacing scale when visual intent does not require an exception.", potentialFix: "Map repeated arbitrary values to the nearest established spacing token after contextual review.", files: relativeFiles(project), rule: "spacing.arbitrary-values" });

  const buttons = (allSource.match(/<button\b/g) ?? []).length + (allSource.match(/(?:Button|button)-(?:primary|secondary|ghost|outline|default)/g) ?? []).length;
  if (buttons >= 8) add(findings, { category: "hierarchy", severity: "medium", confidence: 0.62, risk: "medium", title: "Action hierarchy should be reviewed", evidence: `${buttons} button declarations or variant references were detected. Static analysis cannot prove visual coherence.`, recommendation: "Audit primary, secondary and tertiary actions across screens and keep one clear dominant treatment per context.", files: relativeFiles(project), rule: "hierarchy.button-variants" });

  const responsive = (allSource.match(/(?:sm|md|lg|xl):/g) ?? []).length;
  if (project.framework !== "unknown" && responsive < 3 && project.files.length > 5) add(findings, { category: "responsive", severity: "high", confidence: 0.58, risk: "high", title: "Limited explicit responsive behavior", evidence: `Only ${responsive} responsive utility prefixes were found. This is a signal, not proof that responsive behavior is missing.`, recommendation: "Verify mobile and tablet layouts. Add analyzer adapters for CSS modules, container queries or other responsive mechanisms when present.", files: relativeFiles(project), rule: "responsive.low-signal" });

  const imageTags = (allSource.match(/<img\b/g) ?? []).length;
  const altAttrs = (allSource.match(/\balt\s*=/g) ?? []).length;
  if (imageTags > altAttrs) add(findings, { category: "accessibility", severity: "high", confidence: 0.93, risk: "medium", title: "Images may be missing alternative text", evidence: `${imageTags} img elements and ${altAttrs} alt attributes were detected.`, recommendation: "Give informative images meaningful alternative text and mark purely decorative images appropriately.", potentialFix: "Inspect each image before adding alt text; decorative assets may correctly use an empty alt value.", files: relativeFiles(project), rule: "accessibility.image-alt" });

  const controls = (allSource.match(/<(?:input|select|textarea)\b/g) ?? []).length;
  const labels = (allSource.match(/<label\b/g) ?? []).length + (allSource.match(/aria-label\s*=/g) ?? []).length + (allSource.match(/aria-labelledby\s*=/g) ?? []).length;
  if (controls > labels) add(findings, { category: "accessibility", severity: "high", confidence: 0.86, risk: "high", title: "Form controls may lack accessible names", evidence: `${controls} form controls and ${labels} explicit label/name signals were detected.`, recommendation: "Ensure every interactive form control has an accessible name through a label, aria-label, or aria-labelledby.", files: relativeFiles(project), rule: "accessibility.form-names" });

  if (project.designSystem.tokens.length === 0) add(findings, { category: "design_system", severity: "medium", confidence: 0.88, risk: "medium", title: "No explicit CSS design tokens detected", evidence: "No custom CSS variables were found in analyzed stylesheets.", recommendation: "Introduce a small token layer for recurring color, spacing, type, radius and elevation decisions before normalizing components.", potentialFix: "Create semantic tokens only after confirming repeated visual decisions in the source.", files: project.files.filter((file) => /\.(css|scss|sass)$/.test(file.extension)).map((file) => file.path), rule: "design-system.no-tokens" });

  const repeated = project.designSystem.repeatedValues.filter((item) => item.count >= 3);
  if (repeated.length === 0 && project.designSystem.tokens.length > 0) add(findings, { category: "design_system", severity: "low", confidence: 0.7, risk: "low", title: "Design tokens show limited reuse", evidence: "Few extracted token values repeat across the project.", recommendation: "Review whether token names represent semantic roles and whether repeated decisions have been centralized.", files: [], rule: "design-system.low-reuse" });

  const penalties = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) penalties[finding.severity] += severityPenalty[finding.severity];
  const score = Math.max(0, Math.min(100, 100 - Object.values(penalties).reduce((sum, value) => sum + value, 0)));
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) summary[finding.severity] += 1;
  return { score, scoreModel: { base: 100, penalties, explanation: "Score is a deterministic prioritization signal based on finding severity; it is not an objective measure of design quality." }, findings, summary };
}
