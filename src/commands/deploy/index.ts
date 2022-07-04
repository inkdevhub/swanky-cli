import { Command, Flags } from "@oclif/core";
import { readFileSync, writeFileSync } from "node:fs";
import path = require("node:path");
import { ApiPromise, WsProvider } from "@polkadot/api";
import { CodePromise, Abi } from "@polkadot/api-contract";
import { Keyring } from "@polkadot/keyring";
import { readJSONSync } from "fs-extra";
import { cryptoWaitReady } from "@polkadot/util-crypto";
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

    await cryptoWaitReady();

    const keyring = new Keyring({ type: "sr25519" });
    const pair = keyring.createFromUri(`//${flags.account}`);

    const wsProvider = new WsProvider();
    const api = await ApiPromise.create({ provider: wsProvider });

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

    const code = await new CodePromise(api, abi, wasm);
    await code.tx
      .new({ gasLimit: flags.gas }, ...flags.args)
      .signAndSend(pair, {}, ({ events }) => {
        const success = events.find(
          (event) => event.event.method === "Instantiated"
        );
        if (success) {
          const contractAddress = success.event.data.toArray()[1];
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
          wsProvider.disconnect();
        }
      });
  }
}
