import Ajv2020Module, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const UIIR_VERSION = "0.2.0" as const;
export type UIIR = { version: typeof UIIR_VERSION; project: UIIRProject; product: ProductSpec; designSystem: UIDesignSystem; screens: ScreenSpec[] };
export type UIIRProject = { name: string; framework: "react" | "nextjs" | "vite-react" | "unknown"; sourceRoot?: string };
export type ProductSpec = { name: string; purpose: string; audience: string[] };
export type UIDesignSystem = { id: string; tokens: Record<string, { value: string; category: "color" | "spacing" | "typography" | "radius" | "shadow" | "breakpoint" | "other" }> };
export type ScreenSpec = { id: string; name: string; route: string; layout: "app" | "marketing" | "auth" | "settings" | "unknown"; navigation?: NavigationSpec; regions: RegionSpec[] };
export type NavigationSpec = { mode: "sidebar" | "topbar" | "bottom-tabs" | "none"; items: NavigationItem[] };
export type NavigationItem = { id: string; label: string; icon?: string; route: string };
export type RegionSpec = { id: string; type: "header" | "navigation" | "content" | "aside" | "footer"; layout: "stack" | "grid" | "split" | "freeform"; components: ComponentSpec[] };
export type ComponentSpec = { id: string; component: string; semanticRole?: string; props?: Record<string, unknown>; children?: ComponentSpec[]; layout?: LayoutSpec; typography?: TypographySpec; responsive?: ResponsiveSpec[]; states?: ComponentState[]; interactions?: InteractionSpec[]; accessibility?: AccessibilitySpec };
export type LayoutSpec = { display?: "block" | "flex" | "grid" | "absolute" | "inline"; direction?: "row" | "column"; gap?: string; padding?: string; margin?: string; width?: string; maxWidth?: string; columns?: string };
export type TypographySpec = { role?: "display" | "heading" | "body" | "label" | "caption"; size?: string; weight?: string; lineHeight?: string };
export type ResponsiveSpec = { breakpoint: "mobile" | "tablet" | "desktop"; behavior: "stack" | "hide" | "scroll" | "compact" | "reflow" | "preserve"; value?: string };
export type ComponentState = "default" | "loading" | "empty" | "error" | "disabled" | "success";
export type InteractionSpec = { kind: "click" | "submit" | "change" | "focus" | "hover" | "navigation"; target?: string; action?: string };
export type AccessibilitySpec = { name?: string; role?: string; keyboard?: boolean; labelled?: boolean; described?: boolean };
export type UIIRValidationIssue = { path: string; message: string; severity: "error" | "warning" };
type UIIRSchema = Record<string, unknown>;
type AjvConstructor = new (options?: { allErrors?: boolean; strict?: boolean }) => { compile<T = unknown>(schema: UIIRSchema): ValidateFunction<T> };
const Ajv = Ajv2020Module as unknown as AjvConstructor;
const schema = JSON.parse(readFileSync(fileURLToPath(new URL("../schema/uiir-0.2.0.schema.json", import.meta.url)), "utf8")) as UIIRSchema;
const ajv = new Ajv({ allErrors: true, strict: true });
const validateSchema = ajv.compile<UIIR>(schema);
export function validateUIIR(document: unknown): UIIRValidationIssue[] {
  if (!validateSchema(document)) return (validateSchema.errors ?? []).map((error: ErrorObject) => { const params = error.params as { missingProperty?: string }; const path = error.instancePath || (error.keyword === "required" && params.missingProperty ? `/${params.missingProperty}` : "$"); return { path, message: error.message ?? "UIIR schema validation failed", severity: "error" as const }; });
  const value = document as UIIR; const issues: UIIRValidationIssue[] = []; const ids = new Set<string>();
  for (const [index, screen] of value.screens.entries()) { if (ids.has(screen.id)) issues.push({ path: `/screens/${index}/id`, message: `Duplicate screen id: ${screen.id}`, severity: "error" }); ids.add(screen.id); }
  return issues;
}
export function isValidUIIR(document: unknown): document is UIIR { return validateUIIR(document).every((issue) => issue.severity !== "error"); }
