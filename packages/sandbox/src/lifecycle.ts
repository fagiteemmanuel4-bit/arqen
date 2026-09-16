import fs from "node:fs";
import path from "node:path";
import { docker, dockerOrThrow, dockerAvailable, ensureImage, removeContainer } from "./docker.js";
import { detectPackageManager, installDependencies, killContainer } from "./install.js";
import { attachInstallNetwork, attachServeNetwork, createSandboxNetworks, destroySandboxNetworks, disconnectNetwork, isolatedEnvironment } from "./network.js";
import { startDevServer } from "./serve.js";
import { DEFAULT_SANDBOX_OPTIONS, type SandboxFailure, type SandboxOptions, type SandboxResult, type SandboxRuntime } from "./types.js";

function failure(phase: SandboxFailure["phase"], code: SandboxFailure["code"], message: string, extra: Partial<SandboxFailure> = {}): SandboxResult {
  return { ok: false, error: { phase, code, message, ...extra } };
}

function validateRepository(repoPath: string): string | SandboxFailure {
  try {
    const resolved = fs.realpathSync(path.resolve(repoPath));
    if (!fs.statSync(resolved).isDirectory()) return { phase: "preparing", code: "INVALID_REPOSITORY", message: "Sandbox target is not a directory." };
    if (!fs.existsSync(path.join(resolved, "package.json"))) return { phase: "preparing", code: "INVALID_REPOSITORY", message: "Sandbox target does not contain package.json." };
    return resolved;
  } catch (error) {
    return { phase: "preparing", code: "INVALID_REPOSITORY", message: error instanceof Error ? error.message : String(error) };
  }
}

function safeId(): string { return `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

function validateOptions(options: SandboxOptions): SandboxFailure | undefined {
  const port = options.port ?? DEFAULT_SANDBOX_OPTIONS.port;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return { phase: "preparing", code: "PORT_UNAVAILABLE", message: "Sandbox port must be an integer between 1024 and 65535." };
  const cpu = options.resources?.cpuCount ?? DEFAULT_SANDBOX_OPTIONS.resources.cpuCount;
  const memory = options.resources?.memoryMb ?? DEFAULT_SANDBOX_OPTIONS.resources.memoryMb;
  const pids = options.resources?.pidsLimit ?? DEFAULT_SANDBOX_OPTIONS.resources.pidsLimit;
  if (cpu <= 0 || memory <= 0 || pids <= 0) return { phase: "preparing", code: "UNKNOWN", message: "CPU, memory and PID limits must be positive." };
  return undefined;
}

async function createContainer(repoPath: string, image: string, networks: Awaited<ReturnType<typeof createSandboxNetworks>>, options: SandboxOptions, id: string): Promise<string> {
  const cpu = options.resources?.cpuCount ?? DEFAULT_SANDBOX_OPTIONS.resources.cpuCount;
  const memory = options.resources?.memoryMb ?? DEFAULT_SANDBOX_OPTIONS.resources.memoryMb;
  const pids = options.resources?.pidsLimit ?? DEFAULT_SANDBOX_OPTIONS.resources.pidsLimit;
  const port = options.port ?? DEFAULT_SANDBOX_OPTIONS.port;
  const name = `arqen-sandbox-${id}`;
  const containerId = await dockerOrThrow([
    "create", "--name", name,
    "--network", networks.installNetwork,
    "--publish", `127.0.0.1::${port}`,
    "--cpus", String(cpu),
    "--memory", `${memory}m`,
    "--pids-limit", String(pids),
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges:true",
    "--init",
    image,
  ], 30_000);
  await dockerOrThrow(["cp", `${repoPath}/.`, `${containerId}:/workspace`], 120_000);
  return containerId;
}

async function startContainer(containerId: string): Promise<void> {
  await dockerOrThrow(["start", containerId], 30_000);
}

async function stopAndRemove(containerId: string): Promise<void> {
  await removeContainer(containerId);
}

export async function runSandbox(repoPath: string, options: SandboxOptions = {}): Promise<SandboxResult> {
  const validation = validateRepository(repoPath);
  if (typeof validation !== "string") return { ok: false, error: validation };
  const optionError = validateOptions(options);
  if (optionError) return { ok: false, error: optionError };
  if (!(await dockerAvailable())) return failure("preparing", "DOCKER_UNAVAILABLE", "Docker Engine is unavailable. Start Docker and retry.");

  const manager = options.packageManager ?? detectPackageManager(validation);
  const image = options.image ?? "arqen-sandbox:0.1.0";
  const id = safeId();
  let containerId: string | undefined;
  let networks: Awaited<ReturnType<typeof createSandboxNetworks>> | undefined;

  try {
    await ensureImage(image, options.rebuildImage ?? false);
    networks = await createSandboxNetworks(id, image);
    containerId = await createContainer(validation, image, networks, options, id);
    await attachInstallNetwork(containerId, networks.installNetwork);
    await startContainer(containerId);

    const installTimeout = options.timeouts?.installMs ?? DEFAULT_SANDBOX_OPTIONS.timeouts.installMs;
    const installArgs = options.installArgs ?? (manager === "npm" ? (fs.existsSync(path.join(validation, "package-lock.json")) ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"]) : ["install", "--frozen-lockfile", "--reporter", "append-only"]);
    const install = await installDependencies(containerId, manager, installArgs, installTimeout);
    if (install.timedOut) {
      await killContainer(containerId);
      return failure("installing", "INSTALL_TIMEOUT", `Dependency installation exceeded ${installTimeout}ms.`, { stdout: install.stdout, stderr: install.stderr });
    }
    if (install.code !== 0) {
      await killContainer(containerId);
      return failure("installing", "INSTALL_FAILED", "Dependency installation failed.", { exitCode: install.code, signal: install.signal ?? undefined, stdout: install.stdout, stderr: install.stderr });
    }

    await disconnectNetwork(networks.installNetwork, containerId);
    await removeContainer(networks.proxyContainer);
    await attachServeNetwork(containerId, networks.serveNetwork);

    const startupMs = options.timeouts?.startupMs ?? DEFAULT_SANDBOX_OPTIONS.timeouts.startupMs;
    const served = await startDevServer(containerId, options.port ?? DEFAULT_SANDBOX_OPTIONS.port, manager, options.serveCommand, options.serveArgs, startupMs);
    let stopped = false;
    let maxRuntimeTimer: NodeJS.Timeout | undefined;
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      if (maxRuntimeTimer) clearTimeout(maxRuntimeTimer);
      await stopAndRemove(containerId!);
      if (networks) {
        await destroySandboxNetworks(networks, containerId).catch(() => undefined);
        networks = undefined;
      }
    };
    const maxRuntimeMs = options.timeouts?.maxRuntimeMs ?? DEFAULT_SANDBOX_OPTIONS.timeouts.maxRuntimeMs;
    if (maxRuntimeMs && maxRuntimeMs > 0) maxRuntimeTimer = setTimeout(() => { void stop(); }, maxRuntimeMs);
    return { ok: true, runtime: { containerId, containerPort: options.port ?? DEFAULT_SANDBOX_OPTIONS.port, hostPort: served.hostPort, url: served.url, phase: "ready", stop } };
  } catch (error) {
    if (containerId) await stopAndRemove(containerId);
    if (networks) await destroySandboxNetworks(networks, containerId).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    const code: SandboxFailure["code"] = message.toLowerCase().includes("image") ? "IMAGE_BUILD_FAILED" : message.toLowerCase().includes("http-ready") || message.toLowerCase().includes("published port") ? "SERVE_TIMEOUT" : "UNKNOWN";
    return failure("failed", code, message);
  }
}
