import { ContractData, DeploymentData, consts } from "@astar-network/swanky-core";
import { pathExists } from "fs-extra";
import path from "node:path";

export class Contract {
  static artifactTypes = [".json", ".contract"];
  name: string;
  moduleName: string;
  language: string;
  deployments: DeploymentData[];
  contractPath: string;
  artifactsPath: string;
  constructor(contractRecord: ContractData) {
    this.name = contractRecord.name;
    this.moduleName = contractRecord.moduleName;
    this.language = contractRecord.language;
    this.deployments = contractRecord.deployments;
    this.contractPath = path.resolve("contracts", contractRecord.name);
    this.artifactsPath = path.resolve(consts.ARTIFACTS_PATH, contractRecord.name);
  }

  async pathExists() {
    return pathExists(this.contractPath);
  }

  async artifactsExist() {
    const result: { result: boolean; missing: string[] } = { result: true, missing: [] };
    for (const artifactType of Contract.artifactTypes) {
      const artifactPath = path.resolve(this.artifactsPath, `${this.moduleName}${artifactType}`);

      if (!(await pathExists(artifactPath))) {
        result.result = false;
        result.missing.push(artifactPath);
      }
    }
    return result;
  }
}
