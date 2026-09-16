import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface DockerCommandResult {
  code: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

const MAX_OUTPUT = 64 * 1024;

function boundedAppend(current: string, chunk: Buffer | string): string {
  const next = current + chunk.toString();
  return next.length > MAX_OUTPUT ? next.slice(next.length - MAX_OUTPUT) : next;
}

export async function docker(args: string[], timeoutMs = 30_000): Promise<DockerCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`Docker command timed out after ${timeoutMs}ms: docker ${args.join(" ")}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout = boundedAppend(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = boundedAppend(stderr, chunk); });
    child.once("error", (error) => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
    child.once("close", (code, signal) => { clearTimeout(timer); if (!settled) { settled = true; resolve({ code: code ?? 1, signal, stdout, stderr }); } });
  });
}

export async function dockerOrThrow(args: string[], timeoutMs = 30_000): Promise<string> {
  const result = await docker(args, timeoutMs);
  if (result.code !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || `docker ${args.join(" ")} failed`);
  return result.stdout.trim();
}

export async function dockerAvailable(): Promise<boolean> {
  try {
    const result = await docker(["info", "--format", "{{.ServerVersion}}"], 10_000);
    return result.code === 0;
  } catch {
    return false;
  }
}

export async function ensureImage(image: string, rebuild: boolean): Promise<void> {
  const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const dockerfile = path.join(packageRoot, "Dockerfile");
  if (!fs.existsSync(dockerfile)) throw new Error(`Sandbox Dockerfile not found: ${dockerfile}`);
  if (!rebuild) {
    const inspect = await docker(["image", "inspect", image], 10_000);
    if (inspect.code === 0) return;
  }
  const result = await docker(["build", "-t", image, "-f", dockerfile, packageRoot], 180_000);
  if (result.code !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || "Sandbox image build failed.");
}

export async function containerRunning(containerId: string): Promise<boolean> {
  const result = await docker(["inspect", "-f", "{{.State.Running}}", containerId], 10_000);
  return result.code === 0 && result.stdout.trim() === "true";
}

export async function removeContainer(containerId: string): Promise<void> {
  await docker(["rm", "-f", containerId], 15_000).catch(() => undefined);
}

export async function removeNetwork(network: string): Promise<void> {
  await docker(["network", "rm", network], 15_000).catch(() => undefined);
}
