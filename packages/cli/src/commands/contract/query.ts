import { ContractPromise } from "@polkadot/api-contract";
import { ContractCall } from "../../lib/contractCall";

export class Query extends ContractCall<typeof Query> {
  static summary = "Call a query message on smart contract";

  static args = [...ContractCall.callArgs];

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Query);

    const contract = new ContractPromise(
      this.api.apiInst,
      this.metadata,
      this.deploymentInfo.address
    );

    const storageDepositLimit = null;

    const queryResult = await contract.query[args.messageName](
      this.account.pair.address,
      {
        gasLimit: -1,
        storageDepositLimit,
      },
      ...flags.params
    );

    console.log(`Query result:`);
    console.log(queryResult.result.toHuman());
  }
}
