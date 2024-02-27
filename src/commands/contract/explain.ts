import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Args } from "@oclif/core";
import { Contract } from "../../lib/contract.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import { configName } from "../../lib/index.js";

export class ExplainContract extends SwankyCommand<typeof ExplainContract> {
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

    const contractRecord = this.swankyConfig.contracts[args.contractName];
    if (!contractRecord) {
      throw new ConfigError(
        `Cannot find a contract named ${args.contractName} in "${configName()}"`
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

    await contract.printInfo();
  }
}
