import { execaCommand } from "execa";
import { copy, emptyDir, ensureDir, readJSON } from "fs-extra/esm";
import path from "node:path";
import {
  DEFAULT_NETWORK_URL,
  ARTIFACTS_PATH,
  TYPED_CONTRACTS_PATH,
  DEFAULT_SHIBUYA_NETWORK_URL,
  DEFAULT_SHIDEN_NETWORK_URL, DEFAULT_ASTAR_NETWORK_URL, DEFAULT_ACCOUNT,
} from "./consts.js";
import { SwankyConfig, SwankySystemConfig } from "../types/index.js";
import { ConfigError, FileError, InputError } from "./errors.js";
import { userInfo } from "os";
import { swankyNode } from "./nodeInfo.js";
import { existsSync } from "fs";

export async function commandStdoutOrNull(command: string): Promise<string | null> {
  try {
    const result = await execaCommand(command);
    return result.stdout;
  } catch {
    return null;
  }
}

export async function getSwankyConfig(): Promise<SwankyConfig> {
  const configPath = process.env.SWANKY_CONFIG ?? "swanky.config.json";
  try {
    const config = await readJSON(configPath);
    return config;
  } catch (cause) {
    throw new InputError(`Error reading "${configName()}" in the current directory!`, { cause });
  }
}

export async function getSwankySystemConfig(): Promise<SwankySystemConfig> {
  try {
    const config = await readJSON(findSwankySystemConfigPath() + "/swanky.config.json");
    return config;
  } catch (cause) {
    throw new ConfigError("Error reading swanky.config.json in system directory!", { cause });
  }
}

export function findSwankySystemConfigPath(): string {
  const homeDir = userInfo().homedir;
  const amountOfDirectories = process.cwd().split("/").length - homeDir.split("/").length;
  const configPath = "../".repeat(amountOfDirectories)+"swanky";
  return configPath;
}

export function resolveNetworkUrl(config: SwankyConfig, networkName: string): string {
  if (networkName === "") {
    return DEFAULT_NETWORK_URL;
  }

  try {
    return config.networks[networkName].url;
  } catch {
    throw new ConfigError("Network name not found in SwankyConfig");
  }
}

export async function storeArtifacts(
  artifactsPath: string,
  contractAlias: string,
  moduleName: string
): Promise<void> {
  const destArtifactsPath = path.resolve(ARTIFACTS_PATH, contractAlias);
  const testArtifactsPath = path.resolve("tests", contractAlias, "artifacts");

  await ensureDir(destArtifactsPath);
  await emptyDir(destArtifactsPath);

  await ensureDir(testArtifactsPath);
  await emptyDir(testArtifactsPath);

  try {
    for (const fileName of [`${moduleName}.contract`, `${moduleName}.json`]) {
      const artifactFileToCopy = path.resolve(artifactsPath, fileName);
      await copy(artifactFileToCopy, path.resolve(destArtifactsPath, fileName));
      await copy(artifactFileToCopy, path.resolve(testArtifactsPath, fileName));
    }
  } catch (cause) {
    throw new FileError("Error storing artifacts", { cause });
  }
}
// TODO: Use the Abi type (optionally, support legacy types version)
export function printContractInfo(abi: any) {
  // TODO: Use templating, colorize.
  console.log(`
    😎 ${abi.contract.name} Contract 😎

    Hash: ${abi.source.hash}
    Language: ${abi.source.language}
    Compiler: ${abi.source.compiler}
  `);

  console.log(`    === Constructors ===\n`);
  for (const constructor of abi.spec.constructors) {
    console.log(`    * ${constructor.label}:
        Args: ${
          constructor.args.length > 0
            ? constructor.args.map((arg: any) => {
                return `\n        - ${arg.label} (${arg.type.displayName})`;
              })
            : "None"
        }
        Description: ${constructor.docs.map((line: any) => {
          if (line != "") {
            return `\n         ` + line;
          }
        })}
    `);
  }

  console.log(`    === Messages ===\n`);
  for (const message of abi.spec.messages) {
    console.log(`    * ${message.label}:
        Payable: ${message.payable}
        Args: ${
          message.args.length > 0
            ? message.args.map((arg: any) => {
                return `\n        - ${arg.label} (${arg.type.displayName})`;
              })
            : "None"
        }
        Description: ${message.docs.map((line: any) => {
          if (line != "") {
            return `\n         ` + line;
          }
        })}
    `);
  }
}

export async function generateTypes(contractName: string) {
  const relativeInputPath = `${ARTIFACTS_PATH}/${contractName}`;
  const relativeOutputPath = `${TYPED_CONTRACTS_PATH}/${contractName}`;
  const outputPath = path.resolve(process.cwd(), relativeOutputPath);

  ensureDir(outputPath);
  emptyDir(outputPath);

  await execaCommand(
    `npx typechain-polkadot --in ${relativeInputPath} --out ${relativeOutputPath}`
  );
}
export function ensureAccountIsSet(account: string | undefined, config: SwankyConfig) {
  if(!account && config.defaultAccount === null) {
    throw new ConfigError("No default account set. Please set one or provide an account alias with --account");
  }
}

export function buildSwankyConfig() {
  return {
    node: {
      localPath: "",
      polkadotPalletVersions: swankyNode.polkadotPalletVersions,
      supportedInk: swankyNode.supportedInk,
    },
    defaultAccount: DEFAULT_ACCOUNT,
    accounts: [],
    networks: {
      local: { url: DEFAULT_NETWORK_URL },
      astar: { url: DEFAULT_ASTAR_NETWORK_URL },
      shiden: { url: DEFAULT_SHIDEN_NETWORK_URL },
      shibuya: { url: DEFAULT_SHIBUYA_NETWORK_URL },
    },
    contracts: {},
  };
}

export function isLocalConfigCheck(): boolean {
  const defaultLocalPath = process.cwd() + "/swanky.config.json";
  return process.env.SWANKY_CONFIG === undefined ? existsSync(defaultLocalPath) : existsSync(process.env.SWANKY_CONFIG);
}

export function configName() {
  if(isLocalConfigCheck()) {
    const configPathArray = (process.env.SWANKY_CONFIG === undefined ?
      ["swanky.config.json"] : process.env.SWANKY_CONFIG.split("/"));

    return configPathArray[configPathArray.length - 1];
  }
  return "swanky.config.json";
}