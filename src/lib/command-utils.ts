import { execaCommand, execaCommandSync } from "execa";
import { copy, emptyDir, ensureDir, readJSONSync } from "fs-extra/esm";
import path from "node:path";
import {
  DEFAULT_NETWORK_URL,
  ARTIFACTS_PATH,
  TYPED_CONTRACTS_PATH,
  DEFAULT_SHIBUYA_NETWORK_URL,
  DEFAULT_SHIDEN_NETWORK_URL,
  DEFAULT_ASTAR_NETWORK_URL,
  DEFAULT_ACCOUNT,
  DEFAULT_CONFIG_NAME,
  DEFAULT_CONFIG_FOLDER_NAME,
  DEFAULT_NODE_INFO,
  DEFAULT_RUST_DEP_VERSION,
  DEFAULT_CARGO_CONTRACT_DEP_VERSION,
  DEFAULT_CARGO_DYLINT_DEP_VERSION,
} from "./consts.js";
import { SwankyConfig, SwankySystemConfig } from "../types/index.js";
import { ConfigError, FileError, ProcessError } from "./errors.js";
import { userInfo } from "os";
import { existsSync } from "fs";

export function commandStdoutOrNull(command: string): string | null {
  try {
    const result = execaCommandSync(command);
    return result.stdout;
  } catch {
    return null;
  }
}

export function getSwankyConfig(configType: "local" | "global"): SwankyConfig | SwankySystemConfig {
  let configPath: string;

  if (configType === "global") {
    configPath = getSystemConfigDirectoryPath() + `/${DEFAULT_CONFIG_NAME}`;
  } else {
    configPath = isEnvConfigCheck() ? process.env.SWANKY_CONFIG! : DEFAULT_CONFIG_NAME;
  }

  const config = readJSONSync(configPath);
  return config;
}


export function getSystemConfigDirectoryPath(): string {
  const homeDir = userInfo().homedir;
  const configPath = homeDir + `/${DEFAULT_CONFIG_FOLDER_NAME}`;
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
      polkadotPalletVersions: DEFAULT_NODE_INFO.polkadotPalletVersions,
      supportedInk: DEFAULT_NODE_INFO.supportedInk,
      version: DEFAULT_NODE_INFO.version,
    },
    defaultAccount: DEFAULT_ACCOUNT,
    accounts: [
      {
        "alias": "alice",
        "mnemonic": "//Alice",
        "isDev": true,
        "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      },
      {
        "alias": "bob",
        "mnemonic": "//Bob",
        "isDev": true,
        "address": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
      },
    ],
    networks: {
      local: { url: DEFAULT_NETWORK_URL },
      astar: { url: DEFAULT_ASTAR_NETWORK_URL },
      shiden: { url: DEFAULT_SHIDEN_NETWORK_URL },
      shibuya: { url: DEFAULT_SHIBUYA_NETWORK_URL },
    },
    contracts: {},
    env: {
      rust: extractRustVersion() ?? DEFAULT_RUST_DEP_VERSION,
      "cargo-dylint": extractCargoDylintVersion() ?? DEFAULT_CARGO_DYLINT_DEP_VERSION,
      "cargo-contract": extractCargoContractVersion() ?? DEFAULT_CARGO_CONTRACT_DEP_VERSION,
    },
  };
}

export function isEnvConfigCheck(): boolean {
  if (process.env.SWANKY_CONFIG === undefined) {
    return false;
  } else if (existsSync(process.env.SWANKY_CONFIG)) {
    return true;
  } else {
    throw new ConfigError(`Provided config path ${process.env.SWANKY_CONFIG} does not exist`);
  }
}

export function isLocalConfigCheck(): boolean {
  const defaultLocalConfigPath = process.cwd() + `/${DEFAULT_CONFIG_NAME}`;
  return process.env.SWANKY_CONFIG === undefined
    ? existsSync(defaultLocalConfigPath)
    : existsSync(process.env.SWANKY_CONFIG);
}

export function configName(): string {
  if (!isLocalConfigCheck()) {
    return DEFAULT_CONFIG_NAME + " [system config]";
  }

  return process.env.SWANKY_CONFIG?.split("/").pop() ?? DEFAULT_CONFIG_NAME;
}

export function extractVersion(command: string, regex: RegExp) {
  const output = commandStdoutOrNull(command);
  if (!output) {
    return null;
  }

  const match = output.match(regex);
  if (!match) {
    throw new ProcessError(
      `Unable to determine version from command '${command}'. Please verify its installation.`
    );
  }

  return match[1];
}

export function extractRustVersion() {
  return extractVersion("rustc --version", /rustc (.*) \((.*)/);
}

export function extractCargoVersion() {
  return extractVersion("cargo -V", /cargo (.*) \((.*)/);
}

export function extractCargoNightlyVersion() {
  return extractVersion("cargo +nightly -V", /cargo (.*)-nightly \((.*)/);
}

export function extractCargoDylintVersion() {
  return extractVersion("cargo dylint -V", /cargo-dylint (.*)/);
}

export function extractCargoContractVersion() {
  return extractVersion("cargo contract -V", /cargo-contract-contract (\d+\.\d+\.\d+(?:-[\w.]+)?)(?:-unknown-[\w-]+)/);
}