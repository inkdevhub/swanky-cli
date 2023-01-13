import { Flags } from "@oclif/core";
import { ContractPromise } from "@polkadot/api-contract";
import { cryptoWaitReady } from "@polkadot/util-crypto";

import { ContractCall } from "../../lib/contractCall";

export class Tx extends ContractCall<typeof Tx> {
  static summary = "Call a Tx message on smart contract";

  static flags = {
    dry: Flags.boolean({
      char: "d",
      description: "Do a dry run, without signing the transaction",
    }),
    account: Flags.string({
      required: true,
      char: "a",
      description: "Account to sign the transaction with",
    }),
  };

  static args = [...ContractCall.callArgs];

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Tx);

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

    this.log(`Gas required: ${queryResult.gasRequired.toHuman()}`);

    if (flags.dry) {
      console.log(`Dry run result:`);
      console.log(queryResult.result.toHuman());
      return;
    }

    const customGas = flags.gas ? BigInt(flags.gas) : null;
    await cryptoWaitReady();
    const txResult = await contract.tx[args.messageName](
      {
        storageDepositLimit,
        gasLimit: customGas || queryResult.gasRequired,
      },
      ...flags.params
    );
    await txResult.signAndSend(this.account.pair, (result) => {
      if (result.status.isInBlock) {
        console.log("Tx result:");
        if (flags.verbose) {
          console.log(JSON.stringify(result.toHuman(), null, 2));
        } else {
          console.log(result.toHuman());
        }
        return this.api.apiInst.disconnect();
      }
    });
  }
}
