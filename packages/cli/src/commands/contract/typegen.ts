import { Args, Command } from "@oclif/core";
import * as fs from "fs-extra";
import path = require("node:path");
import { readdirSync } from "node:fs";
import {
  ensureSwankyProject,
  getSwankyConfig,
  Spinner,
  generateTypes,
  consts,
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

    const contractDirList = readdirSync(path.resolve("contracts"));

    const contractPath = path.resolve("contracts", args.contractName);

    if (!contractDirList.includes(args.contractName)) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
    }

    for (const artifact of [".json", ".contract"]) {
      const artifactPath = path.resolve(
        consts.ARTIFACTS_PATH,
        `${contractInfo.moduleName}${artifact}`
      );
      if (!(await fs.pathExists(artifactPath)))
        this.error(`No artifact file found at path: ${artifactPath}`);
    }

    await spinner.runCommand(async () => {
      await generateTypes(args.contractName);
    }, "Generating types");
  }
}
