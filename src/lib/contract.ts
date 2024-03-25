import { AbiType, consts, printContractInfo } from "./index.js";
import { BuildMode, ContractData, DeploymentData } from "../types/index.js";
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
  buildMode?: BuildMode;

  constructor(contractRecord: ContractData) {
    this.name = contractRecord.name;
    this.moduleName = contractRecord.moduleName;
    this.deployments = contractRecord.deployments;
    this.contractPath = path.resolve("contracts", contractRecord.name);
    this.artifactsPath = path.resolve(consts.ARTIFACTS_PATH, contractRecord.name);
    this.buildMode = contractRecord.build?.buildMode;
  }

  async pathExists() {
    return pathExists(this.contractPath);
  }

  async artifactsExist(): Promise<{ result: boolean; missingPaths: string[] }> {
    const missingPaths: string[] = [];
    let result = true;

    for (const artifactType of Contract.artifactTypes) {
      const artifactPath = path.resolve(this.artifactsPath, `${this.moduleName}${artifactType}`);
      if (!(await pathExists(artifactPath))) {
        result = false;
        missingPaths.push(artifactPath);
      }
    }

    return { result, missingPaths };
  }

  async typedContractExists() {
    const result: { result: boolean; missingPaths: string[] } = {
      result: true,
      missingPaths: [],
    };
    const artifactPath = path.resolve("typedContracts", `${this.name}`);
    if (!(await pathExists(artifactPath))) {
      result.result = false;
      result.missingPaths.push(artifactPath);
    }
    return result;
  }

  async getABI(): Promise<AbiType> {
    const jsonArtifactPath = `${this.moduleName}.json`;
    await this.ensureArtifactExists(jsonArtifactPath);
    return readJSON(path.resolve(this.artifactsPath, jsonArtifactPath));
  }

  async getBundle() {
    const contractArtifactPath = `${this.moduleName}.contract`;
    await this.ensureArtifactExists(contractArtifactPath);
    return readJSON(path.resolve(this.artifactsPath, contractArtifactPath), "utf8");
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

  private async ensureArtifactExists(artifactFileName: string): Promise<void> {
    const artifactPath = path.resolve(this.artifactsPath, artifactFileName);
    if (!(await pathExists(artifactPath))) {
      throw new FileError(`Artifact file not found at path: ${artifactPath}`);
    }
  }
}
