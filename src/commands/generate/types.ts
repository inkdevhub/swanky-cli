import { Args } from "@oclif/core";
import { generateTypes } from "../../lib/index.js";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";

export class GenerateTypes extends SwankyCommand<typeof GenerateTypes> {
  static description = "Generate types from compiled contract metadata";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(GenerateTypes);

    const contractRecord = this.swankyConfig.contracts[args.contractName];
    if (!contractRecord) {
      throw new ConfigError(
        `Cannot find a contract named ${args.contractName} in swanky.config.json`
      );
    }

    const contract = new Contract(contractRecord);

    if (!(await contract.pathExists())) {
      throw new FileError(
        `Path to contract ${args.contractName} does not exist: ${contract.contractPath}`
      );
    }

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      throw new FileError(
        `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
      );
    }

    await this.spinner.runCommand(async () => {
      await generateTypes(contract.name);
    }, "Generating types");
  }
}
