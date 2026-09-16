import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("arqen validate", () => {
  it("returns machine-readable project validation without claiming browser execution", () => {
    const cli = path.resolve(process.cwd(), "apps/cli/dist/index.js");
    const fixture = path.resolve(process.cwd(), "fixtures/movie-site-fixture");
    const output = execFileSync(process.execPath, [cli, "validate", fixture, "--json"], { encoding: "utf8" });
    const result = JSON.parse(output) as { kind: string; checks: { parsed: boolean; browser: string; accessibility: string } };
    expect(result.kind).toBe("project-validation");
    expect(result.checks.parsed).toBe(true);
    expect(result.checks.browser).toBe("not-run");
    expect(result.checks.accessibility).toBe("static-only");
  });
});
