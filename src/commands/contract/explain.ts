import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Args } from "@oclif/core";
import { findContractRecord } from "../../lib/index.js";
import { contractFromRecord, ensureArtifactsExist } from "../../lib/checks.js";

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

    const contractRecord = findContractRecord(this.swankyConfig, args.contractName);

    const contract = (await contractFromRecord(contractRecord));

    await ensureArtifactsExist(contract);

    await contract.printInfo();
  }
}
