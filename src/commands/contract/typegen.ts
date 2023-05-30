import { Args, Command } from "@oclif/core";
import { ensureSwankyProject, getSwankyConfig, Spinner, generateTypes } from "../../lib/index.js";
import { Contract } from "../../lib/contract.js";

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

    const contractRecord = config.contracts[args.contractName];
    if (!contractRecord) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const spinner = new Spinner();

    const contract = new Contract(contractRecord);

    if (!(await contract.pathExists())) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contract.contractPath}`);
    }

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      this.error(`No artifact file found at path: ${artifactsCheck.missingPaths}`);
    }

    await spinner.runCommand(async () => {
      await generateTypes(contract.name);
    }, "Generating types");
  }
}
