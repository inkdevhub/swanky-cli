import execa from "execa";
import fs = require("fs-extra");
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path = require("node:path");
import { DEFAULT_NETWORK_URL } from "./consts.js";
import { BuildData, ContractData, SwankyConfig } from "../types";

export async function commandStdoutOrNull(command: string): Promise<string | null> {
  try {
    const result = await execa.command(command);
    return result.stdout;
  } catch {
    return null;
  }
}

export async function ensureSwankyProject(): Promise<void> {
  const configExists = await fs.pathExists("swanky.config.json");
  if (!configExists) {
    throw new Error("No 'swanky.config.json' detected in current folder!");
  }
}

export async function getSwankyConfig(): Promise<SwankyConfig> {
  try {
    const config = await fs.readJSON("swanky.config.json");
    return config;
  } catch {
    throw new Error("No 'swanky.config.json' detected in current folder!");
  }
}

export function resolveNetworkUrl(config: SwankyConfig, networkName: string): string {
  if (networkName === "") {
    return DEFAULT_NETWORK_URL;
  }

  try {
    return config.networks[networkName].url;
  } catch {
    throw new Error("Network name not found in SwankyConfig");
  }
}

export function getBuildCommandFor(
  language: ContractData["language"],
  contractPath: string
): ChildProcessWithoutNullStreams {
  if (language === "ink") {
    return spawn("cargo", ["+nightly", "contract", "build"], {
      cwd: contractPath,
    });
  }
  if (language === "ask") {
    return spawn(
      "yarn",
      ["asc", "--config", `${contractPath}/asconfig.json`, `${contractPath}/index.ts`],
      { env: { ...process.env, ASK_CONFIG: `${contractPath}/askconfig.json` } }
    );
  }

  throw new Error("Unsupported language!");
}

export async function copyArtefactsFor(
  language: ContractData["language"],
  contractName: string,
  contractPath: string
): Promise<BuildData> {
  const ts = Date.now();
  const buildData = {
    timestamp: ts,
    artefactsPath: path.resolve("artefacts", contractName, ts.toString()),
  };

  await fs.ensureDir(buildData.artefactsPath);

  const buildPaths = {
    ask: path.resolve(contractPath, "build"),
    ink: path.resolve(contractPath, "target", "ink"),
  };

  await Promise.all([
    fs.copyFile(
      `${buildPaths[language]}/${contractName}.wasm`,
      `${buildData.artefactsPath}/${contractName}.wasm`
    ),
    fs.copyFile(
      `${buildPaths[language]}/metadata.json`,
      `${buildData.artefactsPath}/metadata.json`
    ),
  ]);

  return buildData;
}