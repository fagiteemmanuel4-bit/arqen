import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
export const DEFAULT_VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 1024, height: 768 }, mobile: { width: 390, height: 844 } } as const;
export type BrowserViewportName = keyof typeof DEFAULT_VIEWPORTS;
export interface BrowserInspectionOptions { target: string; allowedRoot: string; outputDir: string; viewports?: Partial<Record<BrowserViewportName, { width: number; height: number }>>; timeoutMs?: number; }
export interface BrowserServerInspectionOptions extends Omit<BrowserInspectionOptions, "target" | "allowedRoot"> { target: string; }
export interface VisualEvidence { viewport: { name: BrowserViewportName; width: number; height: number }; screenshot: string; dimensions: { viewportWidth: number; viewportHeight: number; documentWidth: number; documentHeight: number }; overflow: { horizontal: boolean; scrollWidth: number; clientWidth: number }; layoutMeasurements: Array<{ selector: string; tag: string; x: number; y: number; width: number; height: number; visible: boolean }>; accessibility: { ariaSnapshot: unknown; violations: Array<{ id: string; impact: string | null; description: string; helpUrl?: string; nodes: number }> }; consoleErrors: string[]; failedRequests: Array<{ url: string; method: string; failure?: string }>; }
export interface BrowserInspectionReport { target: string; evidence: VisualEvidence[]; }
function resolveAllowedRoot(allowedRoot: string): string { return fs.realpathSync(path.resolve(allowedRoot)); }
function assertInsideRoot(filePath: string, root: string): void { const relative = path.relative(root, filePath); if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Browser target or request is outside the allowed fixture root."); }
function resolveTarget(target: string, allowedRoot: string): string { const root = resolveAllowedRoot(allowedRoot); const url = new URL(target); if (url.protocol !== "file:") throw new Error("Browser inspection currently permits only file:// targets; server execution is not enabled."); const filePath = fs.realpathSync(decodeURIComponent(url.pathname)); assertInsideRoot(filePath, root); return `file://${filePath}`; }
function contentType(filePath: string): string { const ext = path.extname(filePath).toLowerCase(); return ({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2" } as Record<string, string>)[ext] ?? "application/octet-stream"; }
async function inspectPage(page: Page, target: string, name: BrowserViewportName, viewport: { width: number; height: number }, outputDir: string, timeoutMs: number): Promise<VisualEvidence> {
  const consoleErrors: string[] = []; const failedRequests: Array<{ url: string; method: string; failure?: string }> = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => { if (request.resourceType() !== "other" && !request.url().endsWith("/favicon.ico")) failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText }); });
  await page.setViewportSize(viewport); await page.goto(target, { waitUntil: "load", timeout: timeoutMs });
  const measurements = await page.locator("body *").evaluateAll((elements) => elements.slice(0, 500).map((element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.className && typeof element.className === "string" ? `.${element.className.trim().split(/\\s+/).slice(0, 2).join(".")}` : ""}`, tag: element.tagName.toLowerCase(), x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 }; }));
  const dimensions = await page.evaluate(() => ({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight })); const ariaSnapshot = await page.locator("body").ariaSnapshot({ mode: "default" }); const axe = await new AxeBuilder({ page }).analyze(); const screenshotPath = path.join(outputDir, `${name}.png`); await page.screenshot({ path: screenshotPath, fullPage: true });
  return { viewport: { name, ...viewport }, screenshot: screenshotPath, dimensions, overflow: { horizontal: dimensions.documentWidth > dimensions.viewportWidth, scrollWidth: dimensions.documentWidth, clientWidth: dimensions.viewportWidth }, layoutMeasurements: measurements, accessibility: { ariaSnapshot, violations: axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact ?? null, description: violation.description, helpUrl: violation.helpUrl, nodes: violation.nodes.length })) }, consoleErrors, failedRequests };
}
export async function inspectLocalFixture(options: BrowserInspectionOptions): Promise<BrowserInspectionReport> {
  const allowedRoot = resolveAllowedRoot(options.allowedRoot); const target = resolveTarget(options.target, allowedRoot); const outputDir = path.resolve(options.outputDir); fs.mkdirSync(outputDir, { recursive: true }); const viewports = { ...DEFAULT_VIEWPORTS, ...(options.viewports ?? {}) } as Record<BrowserViewportName, { width: number; height: number }>;
  const browser = await chromium.launch({ headless: true });
  try { const evidence: VisualEvidence[] = []; for (const name of ["desktop", "tablet", "mobile"] as BrowserViewportName[]) { const context = await browser.newContext({ viewport: viewports[name], javaScriptEnabled: true }); await context.route("**/*", async (route) => { const requestUrl = new URL(route.request().url()); if (requestUrl.protocol !== "file:") return route.abort(); try { const requestPath = fs.realpathSync(decodeURIComponent(requestUrl.pathname)); assertInsideRoot(requestPath, allowedRoot); const body = fs.readFileSync(requestPath); return route.fulfill({ status: 200, contentType: contentType(requestPath), body }); } catch { return route.abort(); } }); const page = await context.newPage(); evidence.push(await inspectPage(page, target, name, viewports[name], outputDir, options.timeoutMs ?? 15000)); await context.close(); } return { target, evidence }; } finally { await browser.close(); }
}

function assertLocalServerTarget(target: string): string {
  const url = new URL(target);
  if (!(url.protocol === "http:" || url.protocol === "https:")) throw new Error("Server inspection only permits http:// or https:// localhost targets.");
  const hostname = url.hostname.toLowerCase();
  if (!(hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1")) throw new Error("Server inspection only permits localhost targets.");
  return url.toString();
}

export async function inspectServer(options: BrowserServerInspectionOptions): Promise<BrowserInspectionReport> {
  const target = assertLocalServerTarget(options.target);
  const allowedOrigin = new URL(target).origin;
  const outputDir = path.resolve(options.outputDir); fs.mkdirSync(outputDir, { recursive: true });
  const viewports = { ...DEFAULT_VIEWPORTS, ...(options.viewports ?? {}) } as Record<BrowserViewportName, { width: number; height: number }>;
  const browser = await chromium.launch({ headless: true });
  try {
    const evidence: VisualEvidence[] = [];
    for (const name of ["desktop", "tablet", "mobile"] as BrowserViewportName[]) {
      const context = await browser.newContext({ viewport: viewports[name], javaScriptEnabled: true, serviceWorkers: "block" });
      await context.route("**/*", async (route) => {
        const requestUrl = new URL(route.request().url());
        if ((requestUrl.protocol === "http:" || requestUrl.protocol === "https:") && requestUrl.origin === allowedOrigin) return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      evidence.push(await inspectPage(page, target, name, viewports[name], outputDir, options.timeoutMs ?? 15000));
      await context.close();
    }
    return { target, evidence };
  } finally { await browser.close(); }
}
