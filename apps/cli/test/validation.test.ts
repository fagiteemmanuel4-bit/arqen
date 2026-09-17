import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("arqen validation and inspection", () => {
  const cli = path.resolve(process.cwd(), "apps/cli/dist/index.js");
  const fixture = path.resolve(process.cwd(), "fixtures/movie-site-fixture");

  it("returns machine-readable project validation", () => {
    const output = execFileSync(process.execPath, [cli, "validate", fixture, "--json"], { encoding: "utf8" });
    const result = JSON.parse(output) as { kind: string; checks: { parsed: boolean; browser: string; accessibility: string } };
    expect(result.kind).toBe("project-validation");
    expect(result.checks.parsed).toBe(true);
    expect(result.checks.browser).toBe("not-run");
    expect(result.checks.accessibility).toBe("not-run");
  });

  it("captures all required viewports and detects the fixture's intentional overflow defect", () => {
    const output = execFileSync(process.execPath, [cli, "inspect", fixture, "--json"], { encoding: "utf8", timeout: 15000 });
    const result = JSON.parse(output) as {
      kind: string;
      checks: { allViewportsLoaded: boolean; horizontalOverflowFree: boolean; accessibilityClean: boolean };
      evidence: Array<{ viewport: { name: string }; overflow: { horizontal: boolean } }>;
    };
    expect(result.kind).toBe("runtime-inspection");
    expect(result.evidence.map((item) => item.viewport.name)).toEqual(["desktop", "tablet", "mobile"]);
    expect(result.checks.allViewportsLoaded).toBe(true);
    expect(result.checks.horizontalOverflowFree).toBe(false);
    expect(result.evidence.some((item) => item.overflow.horizontal)).toBe(true);
    expect(typeof result.checks.accessibilityClean).toBe("boolean");
  }, 20000);
});
