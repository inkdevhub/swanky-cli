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
    return spawn("npx", ["typechain-compiler"]);
  }
  if (language === "ask") {
    return spawn(
      "npx",
      ["asc", "--config", `${contractPath}/asconfig.json`, `${contractPath}/index.ts`],
      { env: { ...process.env, ASK_CONFIG: `${contractPath}/askconfig.json` } }
    );
  }

  throw new Error("Unsupported language!");
}

export async function moveArtifactsFor(
  language: ContractData["language"],
  contractName: string,
  contractPath: string
): Promise<BuildData> {
  const ts = Date.now();
  const buildData = {
    timestamp: ts,
    artifactsPath: path.resolve("artifacts", contractName, ts.toString()),
  };

  await fs.ensureDir(buildData.artifactsPath);

  // const buildPaths = {
  //   ask: path.resolve(contractPath, "build"),
  //   ink: path.resolve(contractPath, "target", "ink"),
  // };

  if (language === "ink") {
    //copy artifacts/contract_name.contract and .json to artifactsPath .wasm and .json
    try {
      await Promise.all([
        fs.copyFile(
          path.resolve("artifacts", `${contractName}.contract`),
          `${buildData.artifactsPath}/${contractName}.wasm`
        ),
        fs.copyFile(
          path.resolve("artifacts", `${contractName}.json`),
          `${buildData.artifactsPath}/${contractName}.json`
        ),
      ]);
      //copy both to test/contract_name/artifacts
      const testArtifacts = path.resolve("test", contractName, "artifacts");
      const testTypedContracts = path.resolve("test", contractName, "typedContract")
      await fs.ensureDir(testArtifacts);
      await fs.ensureDir(testTypedContracts)
      await Promise.all([
        fs.move(
          path.resolve("artifacts", `${contractName}.contract`),
          `${testArtifacts}/${contractName}.contract`,
          { overwrite: true }
        ),
        fs.move(
          path.resolve("artifacts", `${contractName}.json`),
          `${testArtifacts}/${contractName}.json`,
          { overwrite: true }
        ),
        fs.move("typedContract", testTypedContracts, {
          overwrite: true,
        }),
      ]);
    } catch (e) {
      console.error(e);
    }
  } else {
    await Promise.all([
      fs.move(
        path.resolve(contractPath, "build", `${contractName}.wasm`),
        `${buildData.artifactsPath}/${contractName}.wasm`,
        { overwrite: true }
      ),
      fs.move(
        path.resolve(contractPath, "build", "metadata.json"),
        `${buildData.artifactsPath}/${contractName}.json`,
        { overwrite: true }
      ),
    ]);
  }

  return buildData;
}
