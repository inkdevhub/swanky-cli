import { CodePromise, Abi } from "@polkadot/api-contract";
import { KeyringPair } from "@polkadot/keyring/types";

import { ChainApi } from "./substrate-api";

export type AbiType = Abi;

export class DeployApi extends ChainApi {
  // eslint-disable-next-line no-useless-constructor
  constructor(endpoint: string) {
    super(endpoint);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async getGasCost() {}

  public async deploy(
    abi: Abi,
    wasm: Buffer,
    signerPair: KeyringPair,
    gasLimit: number,
    args: string[]
  ) {
    const code = new CodePromise(this._api, abi, wasm);
    const storageDepositLimit = null;
    // TODO: make other constructor names passable by flag
    if (typeof code.tx.new !== "function") {
      throw new Error("Contract has no constructor called 'New'");
    }
    const tx = code.tx.new({ gasLimit, storageDepositLimit }, ...args);
    return new Promise((resolve, reject) => {
      this.signAndSend(signerPair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const instantiateEvent = events.find(({ event }) => event.method === "Instantiated");

          const addresses = instantiateEvent?.event.data.toHuman() as {
            contract: string;
            deployer: string;
          };

          if (!addresses || !addresses.contract)
            reject(new Error("Unable to get the contract address"));
          resolve(addresses.contract);
          this._provider.disconnect();
        }
      });
    });
  }
}
