import { docker, dockerOrThrow, containerRunning } from "./docker.js";
import { isolatedEnvironment } from "./network.js";
import type { PackageManager } from "./types.js";

export interface ServeResult {
  hostPort: number;
  url: string;
}

export function buildServeCommand(manager: PackageManager, command?: string, args?: string[]): string[] {
  if (command) return [command, ...(args ?? [])];
  return [manager === "npm" ? "npm" : "pnpm", "run", "dev"];
}

export async function startDevServer(containerId: string, containerPort: number, manager: PackageManager, command?: string, args?: string[], startupMs = 60_000): Promise<ServeResult> {
  const environment = { ...isolatedEnvironment(), PORT: String(containerPort) };
  const commandArgs = ["exec"];
  for (const [key, value] of Object.entries(environment)) commandArgs.push("-e", `${key}=${value}`);
  commandArgs.push("-d", containerId, ...buildServeCommand(manager, command, args));
  const result = await docker(commandArgs, 15_000);
  if (result.code !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || "Failed to start development server.");

  const mapping = await waitForPublishedPort(containerId, containerPort, startupMs);
  await waitForHttp(mapping.hostPort, startupMs);
  return { hostPort: mapping.hostPort, url: `http://127.0.0.1:${mapping.hostPort}` };
}

async function waitForPublishedPort(containerId: string, containerPort: number, timeoutMs: number): Promise<{ hostPort: number }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await docker(["port", containerId, `${containerPort}/tcp`], 10_000);
    if (result.code === 0) {
      const match = result.stdout.match(/127\.0\.0\.1:(\d+)/) ?? result.stdout.match(/:(\d+)\s*$/m);
      if (match?.[1]) return { hostPort: Number(match[1]) };
    }
    if (!(await containerRunning(containerId))) throw new Error("Development server container exited before publishing its port.");
    await sleep(250);
  }
  throw new Error(`Timed out waiting for Docker to publish port ${containerPort}.`);
}

async function waitForHttp(hostPort: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${hostPort}/`, { signal: AbortSignal.timeout(2_000), redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The dev server may need several seconds to compile its first request.
    }
    await sleep(250);
  }
  throw new Error(`Development server did not become HTTP-ready within ${timeoutMs}ms.`);
}

export async function publishedHostPort(containerId: string, containerPort: number): Promise<number> {
  const result = await dockerOrThrow(["port", containerId, `${containerPort}/tcp`], 10_000);
  const match = result.match(/127\.0\.0\.1:(\d+)/) ?? result.match(/:(\d+)\s*$/m);
  if (!match?.[1]) throw new Error(`Unable to determine published host port for ${containerPort}.`);
  return Number(match[1]);
}

function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
