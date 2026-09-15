import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UIIR_VERSION, validateUIIR } from "../src/schema.js";

const canonicalJsonSchema = JSON.parse(
  readFileSync(fileURLToPath(new URL("../schema/uiir-0.2.0.schema.json", import.meta.url)), "utf8"),
) as { properties: { version: { const: string } } };

const validDocument = () => ({
  version: UIIR_VERSION,
  project: { name: "Example", framework: "react" },
  product: { name: "Example", purpose: "Test", audience: ["developers"] },
  designSystem: { id: "example", tokens: {} },
  screens: [{ id: "home", name: "Home", route: "/", layout: "app", regions: [] }],
});

describe("UIIR validation", () => {
  it("keeps the canonical JSON Schema version aligned with the TypeScript model", () => {
    expect(canonicalJsonSchema.properties.version.const).toBe(UIIR_VERSION);
  });

  it("rejects documents without required structure", () => {
    const issues = validateUIIR({ version: UIIR_VERSION });
    expect(issues.some((issue) => issue.path.includes("project"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("screens"))).toBe(true);
  });

  it("accepts a minimal valid document", () => {
    expect(validateUIIR(validDocument())).toHaveLength(0);
  });

  it("rejects unknown top-level fields", () => {
    const issues = validateUIIR({ ...validDocument(), unexpected: true });
    expect(issues.some((issue) => /must NOT have additional properties/i.test(issue.message))).toBe(true);
  });

  it("rejects a schema version mismatch", () => {
    const issues = validateUIIR({ ...validDocument(), version: "0.1.0" });
    expect(issues.some((issue) => issue.path.includes("version"))).toBe(true);
  });

  it("rejects duplicate screen ids", () => {
    const document = validDocument();
    document.screens = [
      { id: "home", name: "Home", route: "/home", layout: "app", regions: [] },
      { id: "home", name: "Again", route: "/again", layout: "app", regions: [] },
    ];
    const issues = validateUIIR(document);
    expect(issues.some((issue) => issue.path === "/screens/1/id")).toBe(true);
  });

  it("rejects malformed routes through the shared schema", () => {
    const document = validDocument();
    document.screens[0].route = "home";
    const issues = validateUIIR(document);
    expect(issues.some((issue) => issue.path === "/screens/0/route")).toBe(true);
  });
});
