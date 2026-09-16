import { describe, expect, it } from "vitest";
import { inspectServer } from "./index.js";

describe("server browser boundary", () => {
  it("rejects non-local targets before launching Chromium", async () => {
    await expect(inspectServer({ target: "https://example.com", outputDir: ".arqen-test" })).rejects.toThrow("localhost");
  });
});
