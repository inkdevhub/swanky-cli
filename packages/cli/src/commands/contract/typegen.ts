import { Command } from "@oclif/core";
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
const {
  INK_ARTIFACTS_PATH,
  TYPED_CONTRACT_PATH,
} = consts;
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
      const destinationPath = path.resolve(testPath, "typedContract");
      const destinationPathExists = await fs.pathExists(destinationPath);
      if (destinationPathExists) {
        await fs.remove(destinationPath);
      }

      // Because relative path from input (artifacts) and output (typedContract) does matter for generated files of typechain-polkadot,
      // Need to copy artifacts (`.contract` and ABI json) to project root artifacts folder beforehand and use them.
      await fs.copy(
        // @ts-ignore
        contractInfo.build.artifactsPath,
        INK_ARTIFACTS_PATH,
      );

      await generateTypes(INK_ARTIFACTS_PATH, TYPED_CONTRACT_PATH);
      
      await fs.copy(TYPED_CONTRACT_PATH, destinationPath);

      // Need to cleanup files inside artifacts folder, because typechain-polkadot generate types for all files under input folder.
      // Residues affects the result of next contract's type generation.
      // 
      // In compile command, using fs.move from artifacts path, thus there's no residues.
      await fs.remove(INK_ARTIFACTS_PATH);

      // await fs.readdir(INK_ARTIFACTS_PATH)
    }, "Generating types");
  }
}
