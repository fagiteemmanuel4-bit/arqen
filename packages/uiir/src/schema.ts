export const UIIR_VERSION = "0.2.0" as const;

export type UIIR = {
  version: typeof UIIR_VERSION;
  project: UIIRProject;
  product: ProductSpec;
  designSystem: UIDesignSystem;
  screens: ScreenSpec[];
};

export type UIIRProject = {
  name: string;
  framework: "react" | "nextjs" | "vite-react" | "unknown";
  sourceRoot?: string;
};

export type ProductSpec = {
  name: string;
  purpose: string;
  audience: string[];
};

export type UIDesignSystem = {
  id: string;
  tokens: Record<string, { value: string; category: "color" | "spacing" | "typography" | "radius" | "shadow" | "breakpoint" | "other" }>;
};

export type ScreenSpec = {
  id: string;
  name: string;
  route: string;
  layout: "app" | "marketing" | "auth" | "settings" | "unknown";
  navigation?: NavigationSpec;
  regions: RegionSpec[];
};

export type NavigationSpec = {
  mode: "sidebar" | "topbar" | "bottom-tabs" | "none";
  items: NavigationItem[];
};

export type NavigationItem = {
  id: string;
  label: string;
  icon?: string;
  route: string;
};

export type RegionSpec = {
  id: string;
  type: "header" | "navigation" | "content" | "aside" | "footer";
  layout: "stack" | "grid" | "split" | "freeform";
  components: ComponentSpec[];
};

export type ComponentSpec = {
  id: string;
  component: string;
  semanticRole?: string;
  props?: Record<string, unknown>;
  children?: ComponentSpec[];
  layout?: LayoutSpec;
  typography?: TypographySpec;
  responsive?: ResponsiveSpec[];
  states?: ComponentState[];
  interactions?: InteractionSpec[];
  accessibility?: AccessibilitySpec;
};

export type LayoutSpec = {
  display?: "block" | "flex" | "grid" | "absolute" | "inline";
  direction?: "row" | "column";
  gap?: string;
  padding?: string;
  margin?: string;
  width?: string;
  maxWidth?: string;
  columns?: string;
};

export type TypographySpec = {
  role?: "display" | "heading" | "body" | "label" | "caption";
  size?: string;
  weight?: string;
  lineHeight?: string;
};

export type ResponsiveSpec = {
  breakpoint: "mobile" | "tablet" | "desktop";
  behavior: "stack" | "hide" | "scroll" | "compact" | "reflow" | "preserve";
  value?: string;
};

export type ComponentState = "default" | "loading" | "empty" | "error" | "disabled" | "success";

export type InteractionSpec = {
  kind: "click" | "submit" | "change" | "focus" | "hover" | "navigation";
  target?: string;
  action?: string;
};

export type AccessibilitySpec = {
  name?: string;
  role?: string;
  keyboard?: boolean;
  labelled?: boolean;
  described?: boolean;
};

export type UIIRValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

export function validateUIIR(document: unknown): UIIRValidationIssue[] {
  const issues: UIIRValidationIssue[] = [];
  if (!document || typeof document !== "object") return [{ path: "$", message: "UIIR must be an object", severity: "error" }];
  const value = document as Record<string, unknown>;
  if (value.version !== UIIR_VERSION) issues.push({ path: "version", message: `Expected UIIR ${UIIR_VERSION}`, severity: "error" });
  if (!value.project || typeof value.project !== "object") issues.push({ path: "project", message: "Project metadata is required", severity: "error" });
  if (!value.product || typeof value.product !== "object") issues.push({ path: "product", message: "Product metadata is required", severity: "error" });
  if (!value.designSystem || typeof value.designSystem !== "object") issues.push({ path: "designSystem", message: "Design system metadata is required", severity: "error" });
  if (!Array.isArray(value.screens) || value.screens.length === 0) issues.push({ path: "screens", message: "At least one screen is required", severity: "error" });
  if (Array.isArray(value.screens)) {
    const ids = new Set<string>();
    for (const [index, screen] of value.screens.entries()) {
      if (!screen || typeof screen !== "object") { issues.push({ path: `screens[${index}]`, message: "Screen must be an object", severity: "error" }); continue; }
      const s = screen as Record<string, unknown>;
      if (typeof s.id !== "string" || !s.id) issues.push({ path: `screens[${index}].id`, message: "Screen id is required", severity: "error" });
      if (typeof s.route !== "string" || !s.route.startsWith("/")) issues.push({ path: `screens[${index}].route`, message: "Route must start with /", severity: "error" });
      if (typeof s.id === "string" && ids.has(s.id)) issues.push({ path: `screens[${index}].id`, message: `Duplicate screen id: ${s.id}`, severity: "error" });
      if (typeof s.id === "string") ids.add(s.id);
      if (!Array.isArray(s.regions)) issues.push({ path: `screens[${index}].regions`, message: "Screen regions must be an array", severity: "error" });
    }
  }
  return issues;
}

export function isValidUIIR(document: unknown): document is UIIR {
  return validateUIIR(document).every((issue) => issue.severity !== "error");
}
