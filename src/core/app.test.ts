import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import packageLock from "../../package-lock.json";
import tauriConfig from "../../src-tauri/tauri.conf.json";
import { APP, ESI_USER_AGENT } from "./app";

describe("application version", () => {
  it("uses the package version for the About screen and ESI user-agent", () => {
    expect(APP.version).toBe(packageJson.version);
    expect(ESI_USER_AGENT).toContain(`/${packageJson.version} (`);
  });

  it("keeps the native and npm versions aligned before a release", () => {
    expect(tauriConfig.version).toBe(packageJson.version);
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[""].version).toBe(packageJson.version);

    const cargoPackage = readFileSync("src-tauri/Cargo.toml", "utf8").split("\n[")[0];
    const escapedVersion = packageJson.version.replace(/\./g, "\\.");
    expect(cargoPackage).toMatch(new RegExp(`^version = "${escapedVersion}"$`, "m"));
  });
});
