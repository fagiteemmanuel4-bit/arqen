import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectPackageManager } from "./install.js";
import { isolatedEnvironment, registryProxyEnvironment } from "./network.js";

describe("sandbox boundary", () => {
  it("detects pnpm and npm lockfiles", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "arqen-sandbox-"));
    try {
      fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      expect(detectPackageManager(root)).toBe("pnpm");
      fs.rmSync(path.join(root, "pnpm-lock.yaml"));
      fs.writeFileSync(path.join(root, "package-lock.json"), "{}\n");
      expect(detectPackageManager(root)).toBe("npm");
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it("does not inherit provider credentials into its fixed environment", () => {
    const environment = { ...isolatedEnvironment(), ...registryProxyEnvironment() };
    for (const key of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) expect(environment).not.toHaveProperty(key);
  });

  it("pins install proxy egress to the npm registry", () => {
    expect(registryProxyEnvironment()).toMatchObject({ npm_config_registry: "https://registry.npmjs.org/", HTTPS_PROXY: "http://registry-proxy:3128" });
  });
});
