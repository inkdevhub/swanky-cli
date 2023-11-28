import { Args, Flags } from "@oclif/core";
import path from "node:path";
import { Spinner } from "../../lib/index.js";
import { pathExists } from "fs-extra/esm";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, InputError } from "../../lib/errors.js";
import { Contract } from "../../lib/contract.js";

export class VerifyContract extends SwankyCommand<typeof VerifyContract> {
  static description = "Verify the smart contract(s) in your contracts directory";

  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to compile all contracts",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(VerifyContract);

    if (args.contractName === undefined && !flags.all) {
      throw new InputError("No contracts were selected to verify", { winston: { stack: true } });
    }

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];

    const spinner = new Spinner();

    for (const contractName of contractNames) {
      this.logger.info(`Started compiling contract [${contractName}]`);
      const contractInfo = this.swankyConfig.contracts[contractName];
      if (!contractInfo) {
        throw new ConfigError(
          `Cannot find contract info for ${contractName} contract in swanky.config.json`
        );
      }
      const contractPath = path.resolve("contracts", contractInfo.name);
      this.logger.info(`"Looking for contract ${contractInfo.name} in path: [${contractPath}]`);
      if (!(await pathExists(contractPath))) {
        throw new InputError(`Contract folder not found at expected path`);
      }

      const contract = new Contract(contractInfo);

      await spinner.runCommand(
        async () => {
          await contract.verify(spinner, this.logger);
        },
        `Verifying ${contractName} contract`,
        `${contractName} Contract verified successfully`
      );
    }
  }
}
