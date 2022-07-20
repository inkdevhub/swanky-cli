import { Command, Flags } from "@oclif/core";
import { readFileSync, writeFileSync } from "node:fs";
import path = require("node:path");
import { ApiPromise, WsProvider } from "@polkadot/api";
import { CodePromise, Abi } from "@polkadot/api-contract";
import { Keyring } from "@polkadot/keyring";
import { readJSONSync } from "fs-extra";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ChainApi } from "../../lib/substrate-api";
import { KeyringPair } from "@polkadot/keyring/types";
export class DeployContract extends Command {
  static description = "Deploy contract to a running node";

  static flags = {
    account: Flags.string({
      required: true,
      options: ["Alice", "Bob", "Charlie", "Dave", "Eve", "Ferdie"],
    }),
    contract: Flags.string({ char: "c", required: true }),
    gas: Flags.string({
      required: true,
      char: "g",
    }),
    args: Flags.string({
      required: true,
      char: "a",
      multiple: true,
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(DeployContract);
    let config: { contracts: string[] | Record<string, string> } = {
      contracts: [""],
    };
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf-8" });
      config = JSON.parse(file);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    const keyring = new Keyring({ type: "sr25519" });
    const pair = keyring.createFromUri(`//${flags.account}`);

    const buildPath = path.resolve(
      "contracts",
      flags.contract,
      "target",
      "ink"
    );
    const abi = readJSONSync(path.resolve(buildPath, "metadata.json")) as Abi;
    const wasm = readFileSync(
      path.resolve(buildPath, `${flags.contract}.wasm`)
    );

    const api = new DeployApi("ws://127.0.0.1:9944");
    await api.start();

    const contractAddress = await api.deploy(abi, wasm, pair);

    config.contracts[flags.contract] = {
      name: flags.contract,
      address: contractAddress,
    };
    writeFileSync(
      path.resolve("swanky.config.json"),
      JSON.stringify(config, null, 2)
    );
    this.log(`Deploy successful!`);
    this.log(`Contract address: ${contractAddress}`);
  }
}

class DeployApi extends ChainApi {
  constructor(endpoint: string) {
    super(endpoint);
  }

  public async deploy(abi: Abi, wasm: Buffer, signerPair: KeyringPair) {
    await cryptoWaitReady();
    const code = new CodePromise(this._api, abi, wasm);
    const gasLimit = 100000n * 1000000n;
    const storageDepositLimit = null;
    const tx = code.tx.new({ gasLimit, storageDepositLimit }, 1000);
    return new Promise((resolve, reject) => {
      this.signAndSend(signerPair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const instantiateEvent = events.find(
            ({ event }) => event.method === "Instantiated"
          );
          const addresses = instantiateEvent?.event.data.toHuman() as any;
          if (!addresses || !addresses.contract)
            reject(new Error("Unable to get the contract address"));
          resolve(addresses.contract);
          this._provider.disconnect();
        }
      });
    });
  }
}
