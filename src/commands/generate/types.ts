import { Args } from "@oclif/core";
import { findContractRecord, generateTypes } from "../../lib/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { contractFromRecord, ensureArtifactsExist } from "../../lib/checks.js";

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

    const contractRecord = findContractRecord(this.swankyConfig, args.contractName);

    const contract = (await contractFromRecord(contractRecord));

    await ensureArtifactsExist(contract);

    await this.spinner.runCommand(async () => {
      await generateTypes(contract.name);
    }, "Generating types");
  }
}
