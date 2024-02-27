import { AccountData, BuildData, DeploymentData, SwankyConfig, SwankySystemConfig, ZombienetData } from "../index.js";
import { snakeCase } from "change-case";

export class ConfigBuilder<T extends SwankySystemConfig | SwankyConfig> {
  private config: T;

  constructor(existingConfig: T) {
    this.config = { ...existingConfig };
  }

  setDefaultAccount(account: string): ConfigBuilder<T> {
    this.config.defaultAccount = account;
    return this;
  }

  addAccount(account: AccountData): ConfigBuilder<T> {
    this.config.accounts.push(account);
    return this;
  }

  updateNetwork(name: string, url: string): ConfigBuilder<T> {
    if (this.config.networks?.[name]) {
      this.config.networks[name].url = url;
    }
    return this;
  }

  updateNodeSettings(nodeSettings: Partial<SwankyConfig["node"]>): ConfigBuilder<T> {
    if ("node" in this.config) {
      this.config.node = { ...this.config.node, ...nodeSettings };
    }
    return this;
  }

  updateContracts(contracts: SwankyConfig["contracts"]): ConfigBuilder<T> {
    if ("contracts" in this.config) {
      this.config.contracts = { ...contracts };
    }
    return this;
  }

  addContract(name: string, moduleName?: string): ConfigBuilder<T> {
    if ("contracts" in this.config) {
      this.config.contracts[name] = {
        name: name,
        moduleName: moduleName ?? snakeCase(name),
        deployments: [],
      };
    }
    return this;
  }

  addContractDeployment(name: string, data: DeploymentData): ConfigBuilder<T> {
    if ("contracts" in this.config) {
      this.config.contracts[name].deployments.push(data);
    }
    return this;
  }

  addContractBuild(name: string, data: BuildData): ConfigBuilder<T> {
    if ("contracts" in this.config) {
      this.config.contracts[name].build = data;
    }
    return this;
  }

  addZombienet(data: ZombienetData): ConfigBuilder<T> {
    if ("zombienet" in this.config) {
      this.config.zombienet = data;
    }
    return this;
  }

  build(): T {
    return this.config;
  }
}
