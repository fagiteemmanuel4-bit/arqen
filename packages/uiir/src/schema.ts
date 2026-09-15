export const UIIR_VERSION = "0.1" as const;

export type UIIR = {
  version: typeof UIIR_VERSION;
  product: ProductSpec;
  theme: ThemeRef;
  screens: ScreenSpec[];
};

export type ProductSpec = {
  name: string;
  purpose: string;
  audience: string[];
};

export type ThemeRef = {
  id: string;
};

export type ScreenSpec = {
  id: string;
  name: string;
  route: string;
  layout: "app" | "marketing" | "auth" | "settings";
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
  type: "header" | "content" | "aside" | "footer";
  layout: "stack" | "grid" | "split";
  components: ComponentSpec[];
};

export type ComponentSpec = {
  id: string;
  component: ComponentType;
  props?: Record<string, unknown>;
  children?: ComponentSpec[];
  responsive?: ResponsiveSpec;
  state?: ComponentState;
};

export type ComponentType =
  | "PageHeader"
  | "MetricGrid"
  | "MetricCard"
  | "DataTable"
  | "Form"
  | "Button"
  | "Input"
  | "Select"
  | "Card"
  | "EmptyState"
  | "Alert"
  | "Dialog"
  | "ActivityList"
  | "Chart"
  | "Text";

export type ResponsiveSpec = {
  mobile?: "stack" | "hide" | "scroll" | "compact";
  tablet?: "stack" | "hide" | "scroll" | "compact";
};

export type ComponentState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "disabled";
