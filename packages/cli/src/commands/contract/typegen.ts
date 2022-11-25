import { Command } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import {
  ensureSwankyProject,
  getSwankyConfig,
  Spinner,
  generateTypes,
} from "@astar-network/swanky-core";
export class CompileContract extends Command {
  static description = "Generate types from compiled contract metadata";

  static args = [
    {
      name: "contractName",
      required: true,
      description: "Name of the contract",
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const config = await getSwankyConfig();

    const contractInfo = config.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const spinner = new Spinner();

    const contractList = readdirSync(path.resolve("contracts"));

    const contractPath = path.resolve("contracts", args.contractName);
    if (!contractList.includes(args.contractName)) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
    }

    const testPath = path.resolve(`test/${args.contractName}`);

    if (!contractInfo.build) {
      this.error(`No build data for contract "${args.contractName}"`);
    }
    await spinner.runCommand(async () => {
      // @ts-ignore
      await generateTypes(contractInfo.build.artifactsPath, testPath);
    }, "Generating types");
  }
}
