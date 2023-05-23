import { AbiType, consts } from "../lib";
import { ContractData, DeploymentData } from "../types";
import { pathExists, readJson } from "fs-extra";
import path from "node:path";

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
      throw new Error(`Cannot read ABI, path not found: ${check.missingPaths}`);
    }
    return readJson(path.resolve(this.artifactsPath, `${this.moduleName}.json`));
  }

  async getBundle() {
    const check = await this.artifactsExist();
    if (!check.result && check.missingTypes.includes(".contract")) {
      throw new Error(`Cannot read .contract bundle, path not found: ${check.missingPaths}`);
    }
    return readJson(path.resolve(this.artifactsPath, `${this.moduleName}.contract`));
  }

  async getWasm(): Promise<Buffer> {
    const bundle = await this.getBundle();
    if (bundle.source?.wasm) return bundle.source.wasm;

    throw new Error(`Cannot find wasm field in the .contract bundle!`);
  }
}
