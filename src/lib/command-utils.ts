import { execaCommand, execaCommandSync } from "execa";
import { copy, emptyDir, ensureDir, readJSON } from "fs-extra/esm";
import path from "node:path";
import { DEFAULT_NETWORK_URL, ARTIFACTS_PATH, TYPED_CONTRACTS_PATH } from "./consts.js";
import { SwankyConfig } from "../types/index.js";
import { ConfigError, FileError, InputError } from "./errors.js";

export function commandStdoutOrNull(command: string): string | null {
  try {
    const result = execaCommandSync(command);
    return result.stdout;
  } catch {
    return null;
  }
}

export async function getSwankyConfig(): Promise<SwankyConfig> {
  try {
    const config = await readJSON("swanky.config.json");
    return config;
  } catch (cause) {
    throw new InputError("Error reading swanky.config.json in the current directory!", { cause });
  }
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
