import execa from "execa";
import fs = require("fs-extra");
import Files from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path = require("node:path");
import { DEFAULT_NETWORK_URL, ARTIFACTS_PATH, TYPED_CONTRACT_PATH } from "./consts.js";
import { BuildData, ContractData, SwankyConfig } from "../types";
import { generateTypes } from "./tasks.js";
import { Abi } from "@polkadot/api-contract";

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
  contractPath: string,
  release: boolean,
) : ChildProcessWithoutNullStreams {
  if (language === "ink") {
    const args = ["contract", "build", "--manifest-path", `${contractPath}/Cargo.toml`]
    if (release) {
      args.push("--release")
    }
    return spawn(
      "cargo",
      args
    )
  }
  if (language === "ask") {
    const args = ["asc", "--config", `${contractPath}/asconfig.json`, `${contractPath}/index.ts`];
    if (release) {
      args.push("-O");
      args.push("--noAssert");
    }
    return spawn(
      "npx",
      args,
      { env: { ...process.env, ASK_CONFIG: `${contractPath}/askconfig.json` } }
    );
  }
  throw new Error("Unsupported language!");
}

export async function generateTypesFor(
  language: ContractData["language"],
  contractName: string,
  contractPath: string
) {
  // Firstly, need to copy wasm blob and abi.json to workspace folder
  if (language === "ink") {
    await Promise.all([
      fs.copyFile(
        path.resolve(contractPath, "target", "ink", `${contractName}.contract`),
        path.resolve(ARTIFACTS_PATH, `${contractName}.contract`),
      ),
      fs.copyFile(
        path.resolve(contractPath, "target", "ink", `${contractName}.json`),
        path.resolve(ARTIFACTS_PATH, `${contractName}.json`),
      )
    ])
  } else if (language === "ask") {
    await Promise.all([
      fs.copyFile(
        path.resolve(contractPath, "build", `${contractName}.wasm`),
        path.resolve(ARTIFACTS_PATH, `${contractName}.wasm`),
      ),
      fs.copyFile(
        path.resolve(contractPath, "build", "metadata.json"),
        path.resolve(ARTIFACTS_PATH, `${contractName}.json`),
      ),
    ])

    // Ask! build artifacts don't have `.contract` file which is just an combination of abi json and wasm blob
    // `.contract` will have .source.wasm field whose value is wasm blob hex representation.
    // If Ask! officially support .contract file, no need for this step.
    const contract = JSON.parse(Files.readFileSync(path.resolve(ARTIFACTS_PATH, `${contractName}.json`)).toString());
    const wasmBuf = Files.readFileSync(path.resolve(contractPath, "build", `${contractName}.wasm`));
    const prefix = "0x"
    contract.source.wasm = prefix + wasmBuf.toString("hex");
    fs.writeFileSync(path.resolve(ARTIFACTS_PATH, `${contractName}.contract`), JSON.stringify(contract));
    fs.remove(path.resolve(ARTIFACTS_PATH, `${contractName}.wasm`));
  } else {
    throw new Error("Unsupported language!");
  }

  await generateTypes(ARTIFACTS_PATH, TYPED_CONTRACT_PATH)
}

export async function moveArtifacts(
  contractName: string,
): Promise<BuildData> {
  const ts = Date.now();
  const fullPath = path.resolve(ARTIFACTS_PATH, contractName, ts.toString());
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
        path.resolve(ARTIFACTS_PATH, `${contractName}.contract`),
        `${buildData.artifactsPath}/${contractName}.contract`
      ),
      fs.copyFile(
        path.resolve(ARTIFACTS_PATH, `${contractName}.json`),
        `${buildData.artifactsPath}/${contractName}.json`
      ),
    ]);
    // move both to test/contract_name/artifacts
    const testArtifacts = path.resolve("test", contractName, "artifacts");
    const testTypedContracts = path.resolve("test", contractName, "typedContract")
    await fs.ensureDir(testArtifacts);
    await fs.ensureDir(testTypedContracts)
    await Promise.all([
      fs.move(
        path.resolve(ARTIFACTS_PATH, `${contractName}.contract`),
        `${testArtifacts}/${contractName}.contract`,
        { overwrite: true }
      ),
      fs.move(
        path.resolve(ARTIFACTS_PATH, `${contractName}.json`),
        `${testArtifacts}/${contractName}.json`,
        { overwrite: true }
      ),
      fs.move(TYPED_CONTRACT_PATH, testTypedContracts, {
        overwrite: true,
      }),
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
