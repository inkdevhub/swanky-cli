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
const { TEMP_ARTIFACTS_PATH } = consts;

export class CompileContract extends Command {
  static description = "Generate types from compiled contract metadata";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

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
      const destinationPath = path.resolve(testPath, "typedContract");
      const destinationPathExists = await fs.pathExists(destinationPath);
      if (destinationPathExists) {
        await fs.remove(destinationPath);
      }

      await fs.ensureDir(TEMP_ARTIFACTS_PATH);

      // Getting error if typechain-polkadot takes folder with unnecessary files/folders as inputs.
      // So, need to copy artifacts to empty temp folder and use it as input.
      // @ts-ignore
      const buildInfoArtifactsPath = contractInfo.build.artifactsPath;
      (await fs.readdir(buildInfoArtifactsPath)).forEach(async (file) => {
        const filepath = path.resolve(buildInfoArtifactsPath, file);
        const filestat = await fs.stat(filepath);
        if (!filestat.isDirectory()) {
          await fs.copy(filepath, path.resolve(TEMP_ARTIFACTS_PATH, file));
        }
      });

      await generateTypes(path.resolve(TEMP_ARTIFACTS_PATH), destinationPath);

      await fs.remove(TEMP_ARTIFACTS_PATH);
    }, "Generating types");
  }
}
