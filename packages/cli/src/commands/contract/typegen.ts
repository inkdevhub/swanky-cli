import { Args, Command } from "@oclif/core";
import * as fs from "fs-extra";
import path = require("node:path");
import { readdirSync } from "node:fs";
import {
  ensureSwankyProject,
  getSwankyConfig,
  Spinner,
  generateTypes,
} from "@astar-network/swanky-core";

export class TypegenCommand extends Command {
  static description = "Generate types from compiled contract metadata";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(TypegenCommand);

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
      const destinationPath = path.resolve(testPath, "typedContract");
      const destinationPathExists = await fs.pathExists(destinationPath);
      if (destinationPathExists) {
        await fs.remove(destinationPath);
      }

      const buildInfoArtifactsPath = contractInfo.build?.artifactsPath;
      if (buildInfoArtifactsPath == undefined) {
        throw new Error(`Invalid artifacts path "${buildInfoArtifactsPath}"`);
      }

      await generateTypes(buildInfoArtifactsPath, args.contractName, destinationPath)
    }, "Generating types");
  }
}
