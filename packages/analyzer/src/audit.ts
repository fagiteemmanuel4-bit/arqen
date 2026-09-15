import fs from "node:fs";
import path from "node:path";
import type { Project } from "@arqen/core";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingCategory = "hierarchy" | "spacing" | "typography" | "color" | "density" | "consistency" | "responsive" | "accessibility" | "interaction" | "anti-pattern";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  evidence: string;
  recommendation: string;
  files: string[];
  rule: string;
}

export interface AuditResult {
  score: number;
  findings: Finding[];
  summary: { critical: number; high: number; medium: number; low: number; info: number };
}

const UI_EXTENSIONS = /\.(tsx|jsx|ts|js)$/;

function sourceFiles(project: Project): string[] {
  return project.files.filter((file) => UI_EXTENSIONS.test(file.extension)).map((file) => path.join(project.root, file.path));
}

function add(findings: Finding[], finding: Omit<Finding, "id">) {
  findings.push({ ...finding, id: `${finding.rule}:${findings.length + 1}` });
}

export function auditProject(project: Project): AuditResult {
  const findings: Finding[] = [];
  const files = sourceFiles(project);
  let allSource = "";
  for (const file of files) {
    try { allSource += `\n${fs.readFileSync(file, "utf8")}`; } catch { /* file may disappear between scan and audit */ }
  }

  const roundedContainers = (allSource.match(/rounded-(?:lg|xl|2xl|3xl|full)/g) ?? []).length + (allSource.match(/border-radius\s*:/g) ?? []).length;
  if (roundedContainers >= 12) add(findings, { severity: "medium", category: "anti-pattern", title: "High concentration of rounded containers", evidence: `${roundedContainers} rounded-container declarations or utilities were detected across the analyzed UI.`, recommendation: "Reserve larger radii for controls or intentional surfaces; use a smaller, consistent radius scale for structural containers.", files: project.files.filter((file) => UI_EXTENSIONS.test(file.extension)).slice(0, 8).map((file) => file.path), rule: "anti.rounded-containers" });

  const gradients = (allSource.match(/(?:bg-gradient|linear-gradient|radial-gradient)/g) ?? []).length;
  if (gradients >= 3) add(findings, { severity: "low", category: "anti-pattern", title: "Repeated decorative gradients", evidence: `${gradients} gradient declarations were found.`, recommendation: "Keep gradients where they communicate product identity or depth. Remove decorative gradients that do not improve hierarchy or state communication.", files: [], rule: "anti.gradients" });

  const shadows = (allSource.match(/(?:shadow-(?:sm|md|lg|xl|2xl)|box-shadow\s*:)/g) ?? []).length;
  if (shadows >= 10) add(findings, { severity: "low", category: "anti-pattern", title: "Shadow density may be diluting hierarchy", evidence: `${shadows} shadow declarations were found.`, recommendation: "Define a small elevation scale and reserve stronger shadows for overlays and meaningful separation.", files: [], rule: "anti.shadow-density" });

  const arbitrarySpacing = [...allSource.matchAll(/(?:p|m|gap|space-[xy])-\[(\d+(?:\.\d+)?)(?:px|rem)\]/g)].map((match) => match[1]);
  if (arbitrarySpacing.length >= 5) add(findings, { severity: "medium", category: "spacing", title: "Many one-off spacing values", evidence: `${arbitrarySpacing.length} arbitrary spacing utilities were detected.`, recommendation: "Prefer the project's existing spacing scale when the visual intent does not require an exception. Preserve exceptions that encode meaningful geometry.", files: [], rule: "consistency.arbitrary-spacing" });

  const buttonPatterns = (allSource.match(/<button\b/g) ?? []).length + (allSource.match(/(?:Button|button)-(?:primary|secondary|ghost|outline|default)/g) ?? []).length;
  if (buttonPatterns >= 8) add(findings, { severity: "medium", category: "hierarchy", title: "Action hierarchy should be reviewed", evidence: `${buttonPatterns} button declarations or variant references were detected. Static analysis cannot prove whether their visual treatments are coherent.`, recommendation: "Audit primary, secondary and tertiary actions across screens and keep one clear dominant treatment per context.", files: [], rule: "hierarchy.button-variants" });

  const responsiveUtilities = (allSource.match(/(?:sm|md|lg|xl):/g) ?? []).length;
  if (project.framework !== "unknown" && responsiveUtilities < 3 && project.files.length > 5) add(findings, { severity: "high", category: "responsive", title: "Limited explicit responsive behavior", evidence: `Only ${responsiveUtilities} responsive utility prefixes were found in a project with ${project.files.length} analyzed source/style files.`, recommendation: "Verify mobile and tablet layouts explicitly. If responsiveness is encoded through CSS modules or container queries, add analyzer adapters so the evidence is visible rather than assuming it is missing.", files: [], rule: "responsive.low-signal" });

  const imageTags = (allSource.match(/<img\b/g) ?? []).length;
  const altAttrs = (allSource.match(/\balt\s*=/g) ?? []).length;
  if (imageTags > altAttrs) add(findings, { severity: "high", category: "accessibility", title: "Images may be missing alternative text", evidence: `${imageTags} img elements and ${altAttrs} alt attributes were detected.`, recommendation: "Give informative images meaningful alternative text and mark purely decorative images appropriately.", files: [], rule: "a11y.image-alt" });

  const inputs = (allSource.match(/<(?:input|select|textarea)\b/g) ?? []).length;
  const labels = (allSource.match(/<label\b/g) ?? []).length + (allSource.match(/aria-label\s*=/g) ?? []).length + (allSource.match(/aria-labelledby\s*=/g) ?? []).length;
  if (inputs > labels) add(findings, { severity: "high", category: "accessibility", title: "Form controls may lack accessible names", evidence: `${inputs} form controls and ${labels} explicit label/name signals were detected.`, recommendation: "Ensure every interactive form control has an accessible name through a label, aria-label, or aria-labelledby.", files: [], rule: "a11y.form-names" });

  if (project.designSystem.tokens.length === 0) add(findings, { severity: "medium", category: "consistency", title: "No explicit CSS design tokens detected", evidence: "The analyzer found no custom CSS variables in analyzed stylesheets.", recommendation: "Introduce a small token layer for recurring color, spacing, type, radius and elevation decisions before normalizing components.", files: [], rule: "system.no-tokens" });

  const repeated = project.designSystem.repeatedValues.filter((item) => item.count >= 3);
  if (repeated.length === 0 && project.designSystem.tokens.length > 0) add(findings, { severity: "low", category: "consistency", title: "Design tokens show limited reuse", evidence: "Few token values repeat across the extracted token set.", recommendation: "Review whether token names represent semantic roles and whether repeated visual decisions have been centralized.", files: [], rule: "system.low-reuse" });

  const weight: Record<FindingSeverity, number> = { critical: 18, high: 12, medium: 7, low: 3, info: 0 };
  const penalty = findings.reduce((sum, finding) => sum + weight[finding.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) summary[finding.severity] += 1;
  return { score, findings, summary };
}
