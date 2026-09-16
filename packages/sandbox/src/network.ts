import { dockerOrThrow, docker, removeContainer, removeNetwork } from "./docker.js";

const REGISTRY_HOSTS = new Set(["registry.npmjs.org"]);

export interface SandboxNetworks {
  installNetwork: string;
  egressNetwork: string;
  serveNetwork: string;
  proxyContainer: string;
}

export function registryProxyEnvironment(proxyHost = "registry-proxy"): Record<string, string> {
  const proxy = `http://${proxyHost}:3128`;
  return {
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    ALL_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy,
    all_proxy: proxy,
    NO_PROXY: "",
    no_proxy: "",
    npm_config_registry: "https://registry.npmjs.org/",
    npm_config_metrics_registry: "https://registry.npmjs.org/",
  };
}

export function isolatedEnvironment(): Record<string, string> {
  return {
    NODE_ENV: "development",
    CI: "true",
    HOME: "/home/sandbox",
    PATH: "/home/sandbox/.local/share/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOST: "0.0.0.0",
    HOSTNAME: "0.0.0.0",
  };
}

export async function createSandboxNetworks(id: string, image: string): Promise<SandboxNetworks> {
  const installNetwork = `arqen-install-${id}`;
  const egressNetwork = `arqen-egress-${id}`;
  const serveNetwork = `arqen-serve-${id}`;
  const proxyContainer = `arqen-registry-proxy-${id}`;

  await dockerOrThrow(["network", "create", "--internal", installNetwork]);
  await dockerOrThrow(["network", "create", "--opt", "com.docker.network.bridge.gateway_mode_ipv4=isolated", "--internal", serveNetwork]);
  await dockerOrThrow(["network", "create", egressNetwork]);

  await dockerOrThrow([
    "run", "-d", "--name", proxyContainer,
    "--network", installNetwork,
    "--network-alias", "registry-proxy",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges:true",
    "--pids-limit", "128",
    "--memory", "256m",
    "--cpus", "0.5",
    image,
    "node", "/opt/arqen/registry-proxy.mjs",
  ]);
  await dockerOrThrow(["network", "connect", egressNetwork, proxyContainer]);

  return { installNetwork, egressNetwork, serveNetwork, proxyContainer };
}

export async function attachInstallNetwork(containerId: string, network: string): Promise<void> {
  await dockerOrThrow(["network", "connect", network, containerId]);
}

export async function attachServeNetwork(containerId: string, network: string): Promise<void> {
  await dockerOrThrow(["network", "connect", network, containerId]);
}

export async function disconnectNetwork(network: string, containerId: string): Promise<void> {
  await docker(["network", "disconnect", "-f", network, containerId], 15_000).catch(() => undefined);
}

export async function destroySandboxNetworks(networks: SandboxNetworks, containerId?: string): Promise<void> {
  if (containerId) {
    await disconnectNetwork(networks.installNetwork, containerId);
    await disconnectNetwork(networks.serveNetwork, containerId);
  }
  await removeContainer(networks.proxyContainer);
  await removeNetwork(networks.installNetwork);
  await removeNetwork(networks.egressNetwork);
  await removeNetwork(networks.serveNetwork);
}

export function isAllowedRegistry(hostname: string): boolean {
  return REGISTRY_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ""));
}
