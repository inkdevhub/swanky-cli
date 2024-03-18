import { ConfigError, FileError, InputError, ProcessError } from "./errors.js";
import { pathExists } from "fs-extra";
import chalk from "chalk";
import path from "node:path";
import semver from "semver";
import { Contract } from "./contract.js";
import { AccountData, ContractData } from "../types/index.js";

export function ensureContractNameOrAllFlagIsSet(
  args: any,
  flags: any,
  errorMessage = "No contracts were selected. Specify a contract name or use the --all flag."
) {
  if (args.contractName === undefined && !flags.all) {
    throw new ConfigError(errorMessage);
  }
}

export async function ensureContractPathExists(contractName: string, projectPath = "") {
  const contractPath = path.resolve(projectPath, "contracts", contractName);
  if (!(await pathExists(contractPath))) {
    throw new InputError(
      `Contract folder not found ${chalk.yellowBright(contractName)} at path: ${contractPath}`
    );
  }
}

export async function contractFromRecord(contractRecord: ContractData) {
  const contract = new Contract(contractRecord);

  if (!(await contract.pathExists())) {
    throw new FileError(
      `Path to contract ${contractRecord.name} does not exist: ${contract.contractPath}`
    );
  }
  return contract;
}

export async function ensureArtifactsExist(contract: Contract) {
  const artifactsCheck = await contract.artifactsExist();
  if (!artifactsCheck.result) {
    throw new FileError(
      `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
    );
  }
}

export async function ensureTypedContractExists(contract: Contract) {
  const typedContractCheck = await contract.typedContractExists();

  if (!typedContractCheck.result) {
    throw new FileError(
      `No typed contract found at path: ${typedContractCheck.missingPaths.toString()}`
    );
  }
}

export function ensureDevAccountNotInProduction(accountData: AccountData, network: string) {
  if (accountData.isDev && network !== "local") {
    throw new ConfigError(
      `Account ${accountData.alias} is a DEV account and can only be used with local network`
    );
  }
}

export function ensureCargoContractVersionCompatibility(
  cargoContractVersion: string,
  minimalVersion: string,
  invalidVersionsList?: string[]
) {
  if (invalidVersionsList?.includes(cargoContractVersion)) {
    throw new ProcessError(
      `The cargo-contract version ${cargoContractVersion} is not supported. Please update or change the version.`
    );
  }

  if (!semver.satisfies(cargoContractVersion.replace(/-.*$/, ""), `>=${minimalVersion}`)) {
    throw new ProcessError(
      `cargo-contract version >= ${minimalVersion} required, but found version ${cargoContractVersion}. Please update to a compatible version.`
    );
  }
}
