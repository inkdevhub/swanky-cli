import execa from "execa";
import fs = require("fs-extra");
import path = require("node:path");
import { DEFAULT_NETWORK_URL, STORED_ARTIFACTS_PATH } from "./consts.js";
import { BuildData, SwankyConfig } from "../types";
import { Abi } from "@polkadot/api-contract";
import { TEMP_ARTIFACTS_PATH, TEMP_TYPED_CONTRACT_PATH } from "./consts";

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

export async function storeArtifacts(
  artifactsPath: string,
  contractName: string,
): Promise<BuildData> {
  const ts = Date.now();
  const fullPath = path.resolve(STORED_ARTIFACTS_PATH, contractName, ts.toString());
  const relativePath = path.relative(path.resolve(), fullPath);
  const buildData = {
    timestamp: ts,
    artifactsPath: relativePath,
  };

  await fs.ensureDir(buildData.artifactsPath);

  // copy artifacts/contract_name.contract and .json to artifactsPath .contract and .json
  try {
    await Promise.all([
      fs.copyFile(
        path.resolve(artifactsPath, `${contractName}.contract`),
        `${buildData.artifactsPath}/${contractName}.contract`
      ),
      fs.copyFile(
        path.resolve(artifactsPath, `${contractName}.json`),
        `${buildData.artifactsPath}/${contractName}.json`
      ),
    ]);
    // move both to test/contract_name/artifacts
    const testArtifacts = path.resolve("test", contractName, "artifacts");
    await fs.ensureDir(testArtifacts);
    await Promise.all([
      fs.move(
        path.resolve(artifactsPath, `${contractName}.contract`),
        `${testArtifacts}/${contractName}.contract`,
        { overwrite: true }
      ),
      fs.move(
        path.resolve(artifactsPath, `${contractName}.json`),
        `${testArtifacts}/${contractName}.json`,
        { overwrite: true }
      ),
    ]);
  } catch (e) {
    console.error(e);
  }

  return buildData;
}

export async function printContractInfo(metadataPath: string) {
  const abi = new Abi((await fs.readJson(metadataPath)));

  // TODO: Use templating, colorize.

  console.log(`
    😎 ${abi.info.contract.name} Contract 😎

    Hash: ${abi.info.source.hash}
    Language: ${abi.info.source.language}
    Compiler: ${abi.info.source.compiler}
  `)

  console.log(`    === Constructors ===\n`)
  for (const constructor of abi.constructors) {
    console.log(`    * ${constructor.method}:
        Args: ${constructor.args.length > 0 ? constructor.args.map((arg) => {
          return `\n        - ${arg.name} (${arg.type.displayName})`
        }) : "None"}
        Description: ${constructor.docs.map((line) => {
          if (line != "") {
            return `\n         ` + line
          }
        })}
    `)
  }

  console.log(`    === Messages ===\n`)
  for (const message of abi.messages) {
    console.log(`    * ${message.method}:
        Payable: ${message.isPayable}
        Args: ${message.args.length > 0 ? message.args.map((arg) => {
          return `\n        - ${arg.name} (${arg.type.displayName})`
        }) : "None"}
        Description: ${message.docs.map((line) => {
          if (line != "") {
            return `\n         ` + line
          }
        })}
    `)
  }
}

export async function generateTypes(inputAbsPath: string, contractName: string, outputAbsPath: string) {
  await fs.ensureDir(TEMP_ARTIFACTS_PATH);

  // Getting error if typechain-polkadot takes folder with unnecessary files/folders as inputs.
  // So, need to copy artifacts to empty temp folder and use it as input.
  (await fs.readdir(TEMP_ARTIFACTS_PATH)).forEach(async (file) => {
    const filepath = path.resolve(TEMP_ARTIFACTS_PATH, file);
    const filestat = await fs.stat(filepath);
    if (!filestat.isDirectory()) {
      await fs.remove(filepath);
    }
  });

  // Cannot generate typedContract directly to `outputAbsPath`
  // because relative path of typechain-polkadot input and output folder does matter for later use.
  await fs.copyFile(
    path.resolve(inputAbsPath, `${contractName}.contract`),
    path.resolve(TEMP_ARTIFACTS_PATH, `${contractName}.contract`),
  ),
  await fs.copyFile(
    path.resolve(inputAbsPath, `${contractName}.json`),
    path.resolve(TEMP_ARTIFACTS_PATH, `${contractName}.json`),
  )

  await execa.command(`npx typechain-polkadot --in ${TEMP_ARTIFACTS_PATH} --out ${TEMP_TYPED_CONTRACT_PATH}`);

  await fs.move(path.resolve(TEMP_TYPED_CONTRACT_PATH), outputAbsPath, { overwrite: true })
}
