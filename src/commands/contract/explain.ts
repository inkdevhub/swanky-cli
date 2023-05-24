import { BaseCommand } from "../../lib/baseCommand.js";
import * as fs from "fs-extra";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { printContractInfo } from "../../lib/index.js";
import { Args } from "@oclif/core";

export class ExplainContract extends BaseCommand {
  static description = "Explain contract messages based on the contracts' metadata";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ExplainContract);

    const contractInfo = this.swankyConfig.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const contractList = readdirSync(path.resolve("contracts"));

    const contractPath = path.resolve("contracts", args.contractName);
    if (!contractList.includes(args.contractName)) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
    }

    if (!contractInfo.build) {
      this.error(`No build data for contract "${args.contractName}"`);
    }

    const metadataPath = path.resolve(
      contractInfo.build?.artifactsPath,
      `${args.contractName}.json`
    );
    if (!fs.existsSync(metadataPath)) {
      this.error(`Metadata json file for ${args.contractName} contract not found`);
    }

    printContractInfo(metadataPath);
  }
}
