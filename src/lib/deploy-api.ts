import { CodePromise, Abi } from "@polkadot/api-contract";
import { KeyringPair } from "@polkadot/keyring/types";

import { ChainApi } from "./substrate-api.js";

export type AbiType = Abi;
const TEN_B = 10_000_000_000;
export class DeployApi extends ChainApi {
  public async deploy(
    abi: Abi,
    wasm: Buffer,
    constructorName: string,
    signerPair: KeyringPair,
    args: string[],
    customGas?: number
  ) {
    const gasLimit = this.apiInst.registry.createType("WeightV2", {
      refTime: BigInt(TEN_B),
      proofSize: BigInt(customGas || 10_000_000_000),
    });

    const code = new CodePromise(this._api, abi, wasm);
    const storageDepositLimit = null;
    if (typeof code.tx[constructorName] !== "function") {
      throw new Error(`Contract has no constructor called ${constructorName}`);
    }
    const tx = code.tx[constructorName]({ gasLimit, storageDepositLimit }, ...(args || []));
    return new Promise((resolve, reject) => {
      this.signAndSend(signerPair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const instantiateEvent = events.find(({ event }: any) => event.method === "Instantiated");

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
