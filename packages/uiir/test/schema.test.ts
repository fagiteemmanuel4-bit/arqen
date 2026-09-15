import { describe, expect, it } from "vitest";
import { UIIR_VERSION, validateUIIR } from "../src/schema";

describe("UIIR validation", () => {
  it("rejects documents without required structure", () => {
    const issues = validateUIIR({ version: UIIR_VERSION });
    expect(issues.some((issue) => issue.path === "project")).toBe(true);
    expect(issues.some((issue) => issue.path === "screens")).toBe(true);
  });

  it("accepts a minimal valid document", () => {
    const issues = validateUIIR({
      version: UIIR_VERSION,
      project: { name: "Example", framework: "react" },
      product: { name: "Example", purpose: "Test", audience: ["developers"] },
      designSystem: { id: "example", tokens: {} },
      screens: [{ id: "home", name: "Home", route: "/", layout: "app", regions: [] }],
    });
    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });
});
