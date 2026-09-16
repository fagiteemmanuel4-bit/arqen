import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { inspectLocalFixture } from "../src/index.js";
const browserAvailable = fs.existsSync(chromium.executablePath());
describe("browser inspection", () => {
  it.skipIf(!browserAvailable)("captures desktop, tablet and mobile evidence", async () => {
    const root = path.resolve(process.cwd(), "fixtures/browser-smoke"); const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "arqen-browser-evidence-")); const report = await inspectLocalFixture({ target: pathToFileURL(path.join(root, "index.html")).href, allowedRoot: root, outputDir });
    expect(report.evidence.map((item) => item.viewport.name)).toEqual(["desktop", "tablet", "mobile"]); expect(report.evidence.every((item) => fs.existsSync(item.screenshot))).toBe(true); expect(report.evidence.find((item) => item.viewport.name === "mobile")?.overflow.horizontal).toBe(true); expect(report.evidence[0].accessibility.ariaSnapshot).toBeTruthy();
  });
  it.skipIf(!browserAvailable)("captures the golden movie fixture at all required viewports", async () => {
    const root = path.resolve(process.cwd(), "fixtures/movie-site-fixture"); const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "arqen-movie-evidence-")); const report = await inspectLocalFixture({ target: pathToFileURL(path.join(root, "index.html")).href, allowedRoot: root, outputDir });
    expect(report.evidence).toHaveLength(3); expect(report.evidence.map((item) => item.viewport.width)).toEqual([1440, 1024, 390]); expect(report.evidence.every((item) => item.accessibility.ariaSnapshot)).toBe(true);
    expect(report.evidence.every((item) => item.failedRequests.length === 0), JSON.stringify(report.evidence.map((item) => ({ viewport: item.viewport.name, failedRequests: item.failedRequests })))).toBe(true);
    expect(report.evidence.find((item) => item.viewport.name === "mobile")?.overflow.horizontal).toBe(true); expect(report.evidence.every((item) => item.screenshot.endsWith(".png"))).toBe(true);
  });
  it("rejects targets outside the allowed root before launching work", async () => { const root = path.resolve(process.cwd(), "fixtures/browser-smoke"); await expect(inspectLocalFixture({ target: pathToFileURL(path.join(process.cwd(), "README.md")).href, allowedRoot: root, outputDir: os.tmpdir() })).rejects.toThrow("outside the allowed fixture root"); });
});
