export type PackageManager = "pnpm" | "npm";

export type SandboxPhase = "preparing" | "installing" | "starting" | "ready" | "failed" | "stopped";

export interface SandboxResourceLimits {
  cpuCount?: number;
  memoryMb?: number;
  pidsLimit?: number;
}

export interface SandboxTimeouts {
  installMs?: number;
  startupMs?: number;
  maxRuntimeMs?: number;
}

export interface SandboxOptions {
  packageManager?: PackageManager;
  installArgs?: string[];
  serveCommand?: string;
  serveArgs?: string[];
  port?: number;
  resources?: SandboxResourceLimits;
  timeouts?: SandboxTimeouts;
  image?: string;
  rebuildImage?: boolean;
}

export interface SandboxRuntime {
  containerId: string;
  containerPort: number;
  hostPort: number;
  url: string;
  phase: "ready";
  stop(): Promise<void>;
}

export interface SandboxFailure {
  phase: SandboxPhase;
  code:
    | "INVALID_REPOSITORY"
    | "DOCKER_UNAVAILABLE"
    | "IMAGE_BUILD_FAILED"
    | "INSTALL_FAILED"
    | "INSTALL_TIMEOUT"
    | "SERVE_FAILED"
    | "SERVE_TIMEOUT"
    | "PORT_UNAVAILABLE"
    | "CONTAINER_FAILED"
    | "UNKNOWN";
  message: string;
  exitCode?: number;
  signal?: string;
  stdout?: string;
  stderr?: string;
}

export type SandboxResult =
  | { ok: true; runtime: SandboxRuntime }
  | { ok: false; error: SandboxFailure };

export const DEFAULT_SANDBOX_OPTIONS = {
  port: 3000,
  resources: { cpuCount: 2, memoryMb: 2048, pidsLimit: 512 },
  timeouts: { installMs: 120_000, startupMs: 60_000 },
} as const;

export async function runInSandbox(repoPath: string, options?: SandboxOptions): Promise<SandboxResult> {
  const { runSandbox } = await import("./lifecycle.js");
  return runSandbox(repoPath, options);
}
