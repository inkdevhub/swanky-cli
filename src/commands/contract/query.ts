import { ContractPromise } from "@polkadot/api-contract/promise";
import { ContractCall } from "../../lib/contractCall.js";

export class Query extends ContractCall<typeof Query> {
  static description = "Call a query message on smart contract";

  static args = { ...ContractCall.callArgs };

  static flags = { ...ContractCall.callFlags };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Query);

    const contract = new ContractPromise(
      this.api.apiInst,
      this.metadata,
      this.deploymentInfo.address
    );

    const storageDepositLimit = null;

    const gasLimit: any = this.api.apiInst.registry.createType("WeightV2", {
      refTime: BigInt(10000000000),
      proofSize: BigInt(10000000000),
    });
    const queryResult = await contract.query[args.messageName](
      this.account.pair.address,
      {
        gasLimit,
        storageDepositLimit,
      },
      ...flags.params
    );

    await this.api.apiInst.disconnect();
    console.log(`Query result: ${queryResult.output?.toString()}`);
    if (flags.verbose) console.log(queryResult.result.toHuman());
  }
}
