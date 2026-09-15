export type ID = string;

export type Framework = "react" | "nextjs" | "vite-react" | "unknown";
export type Language = "typescript" | "javascript" | "mixed" | "unknown";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";
export type StylingStrategy = "tailwind" | "css-modules" | "css" | "styled-components" | "emotion" | "mixed" | "unknown";

export interface SourceFile {
  path: string;
  extension: string;
  bytes: number;
  language: Language;
}

export interface Project {
  root: string;
  name: string;
  framework: Framework;
  language: Language;
  packageManager: PackageManager;
  styling: StylingStrategy;
  files: SourceFile[];
  entryPoints: string[];
  routes: Route[];
  components: Component[];
  designSystem: DesignSystem;
}

export interface Application {
  id: ID;
  name: string;
  projectRoot: string;
  framework: Framework;
  screens: Screen[];
}

export interface Screen {
  id: ID;
  name: string;
  route: string;
  sourceFiles: string[];
  components: ID[];
}

export interface Route {
  path: string;
  file: string;
  kind: "page" | "layout" | "api" | "unknown";
}

export interface Component {
  id: ID;
  name: string;
  file: string;
  kind: "function" | "class" | "unknown";
  exported: boolean;
  jsxElements: string[];
  props: string[];
  sourceLines: number;
}

export interface DesignToken {
  name: string;
  category: "color" | "spacing" | "typography" | "radius" | "shadow" | "breakpoint" | "other";
  value: string;
  source: string;
}

export interface DesignSystem {
  tokens: DesignToken[];
  repeatedValues: Array<{ value: string; count: number; category: DesignToken["category"] }>;
  componentPatterns: Array<{ name: string; count: number; files: string[] }>;
}

export interface Layout {
  display: "block" | "flex" | "grid" | "absolute" | "unknown";
  direction?: "row" | "column";
  gap?: string;
  columns?: string;
}

export interface Interaction {
  kind: "click" | "submit" | "change" | "focus" | "hover" | "navigation" | "unknown";
  target?: string;
  source?: string;
}

export interface UIState {
  kind: "default" | "loading" | "empty" | "error" | "disabled";
  source?: string;
}

export interface ResponsiveBehavior {
  breakpoint: string;
  behavior: "stack" | "hide" | "scroll" | "compact" | "reflow" | "unknown";
  source?: string;
}

export interface AccessibilitySignal {
  kind: "semantic-element" | "aria-label" | "alt-text" | "keyboard-handler" | "form-label" | "potential-issue";
  message: string;
  file?: string;
  line?: number;
}

export interface Region {
  id: ID;
  role: "header" | "navigation" | "main" | "aside" | "footer" | "content" | "unknown";
  componentIds: ID[];
  layout?: Layout;
}
