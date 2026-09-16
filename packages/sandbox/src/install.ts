import fs from "node:fs";
import path from "node:path";
import { docker } from "./docker.js";
import { registryProxyEnvironment } from "./network.js";
import type { PackageManager } from "./types.js";

export function detectPackageManager(repoPath: string): PackageManager {
  if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(repoPath, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(repoPath, "npm-shrinkwrap.json"))) return "npm";
  return "pnpm";
}

export function buildInstallArgs(manager: PackageManager, explicit?: string[]): string[] {
  if (explicit?.length) return explicit;
  if (manager === "npm") return fs.existsSync("/workspace/package-lock.json") ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"];
  return ["install", "--frozen-lockfile", "--reporter", "append-only"];
}

export async function installDependencies(containerId: string, manager: PackageManager, args: string[], timeoutMs: number) {
  const executable = manager === "npm" ? "npm" : "pnpm";
  const result = await runContainerCommand(containerId, [executable, ...args], registryProxyEnvironment(), timeoutMs);
  if (result.timedOut) return { ...result, failureCode: "INSTALL_TIMEOUT" as const };
  return { ...result, failureCode: result.code === 0 ? undefined : "INSTALL_FAILED" as const };
}

export interface CommandResult {
  code: number;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const MAX_OUTPUT = 64 * 1024;

function append(current: string, value: string): string {
  const next = current + value;
  return next.length > MAX_OUTPUT ? next.slice(next.length - MAX_OUTPUT) : next;
}

export async function runContainerCommand(containerId: string, command: string[], environment: Record<string, string>, timeoutMs: number): Promise<CommandResult> {
  const args = ["exec"];
  for (const [key, value] of Object.entries(environment)) args.push("-e", `${key}=${value}`);
  args.push(containerId, ...command);
  return new Promise((resolve, reject) => {
    import("node:child_process").then(({ spawn }) => {
      const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        resolve({ code: 124, signal: "SIGKILL", stdout, stderr, timedOut: true });
      }, timeoutMs);
      child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk.toString()); });
      child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk.toString()); });
      child.once("error", (error) => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
      child.once("close", (code, signal) => { clearTimeout(timer); if (!settled) { settled = true; resolve({ code: code ?? 1, signal, stdout, stderr, timedOut: false }); } });
    }).catch(reject);
  });
}

export async function killContainer(containerId: string): Promise<void> {
  await docker(["kill", containerId], 15_000).catch(() => undefined);
}
