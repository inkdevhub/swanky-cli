import { AbiType, consts, printContractInfo } from "./index.js";
import { ContractData, DeploymentData } from "../types/index.js";
import { pathExists, readJSON } from "fs-extra/esm";
import path from "node:path";
import { FileError } from "./errors.js";

export class Contract {
  static artifactTypes = [".json", ".contract"];
  name: string;
  moduleName: string;
  deployments: DeploymentData[];
  contractPath: string;
  artifactsPath: string;
  constructor(contractRecord: ContractData) {
    this.name = contractRecord.name;
    this.moduleName = contractRecord.moduleName;
    this.deployments = contractRecord.deployments;
    this.contractPath = path.resolve("contracts", contractRecord.name);
    this.artifactsPath = path.resolve(consts.ARTIFACTS_PATH, contractRecord.name);
  }

  async pathExists() {
    return pathExists(this.contractPath);
  }

  async artifactsExist() {
    const result: { result: boolean; missingPaths: string[]; missingTypes: string[] } = {
      result: true,
      missingPaths: [],
      missingTypes: [],
    };
    for (const artifactType of Contract.artifactTypes) {
      const artifactPath = path.resolve(this.artifactsPath, `${this.moduleName}${artifactType}`);

      if (!(await pathExists(artifactPath))) {
        result.result = false;
        result.missingPaths.push(artifactPath);
        result.missingTypes.push(artifactType);
      }
    }
    return result;
  }

  async getABI(): Promise<AbiType> {
    const check = await this.artifactsExist();
    if (!check.result && check.missingTypes.includes(".json")) {
      throw new FileError(`Cannot read ABI, path not found: ${check.missingPaths.toString()}`);
    }
    return readJSON(path.resolve(this.artifactsPath, `${this.moduleName}.json`));
  }

  async getBundle() {
    const check = await this.artifactsExist();
    if (!check.result && check.missingTypes.includes(".contract")) {
      throw new FileError(
        `Cannot read .contract bundle, path not found: ${check.missingPaths.toString()}`
      );
    }
    return readJSON(path.resolve(this.artifactsPath, `${this.moduleName}.contract`), 'utf-8');
  }

  async getWasm(): Promise<Buffer> {
    const bundle = await this.getBundle();
    if (bundle.source?.wasm) return bundle.source.wasm;

    throw new FileError(`Cannot find wasm field in the .contract bundle!`);
  }

  async printInfo(): Promise<void> {
    const abi = await this.getABI();
    printContractInfo(abi);
  }
}
