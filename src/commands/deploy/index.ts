import { Command, Flags } from "@oclif/core";
import { readFileSync, writeFileSync } from "node:fs";
import path = require("node:path");
import { CodePromise, Abi } from "@polkadot/api-contract";
import { readJSONSync, writeJSONSync } from "fs-extra";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ChainApi } from "../../lib/substrate-api";
import { KeyringPair } from "@polkadot/keyring/types";
import { Listr } from "listr2";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";
import { ChainAccount } from "../../lib/account";
export class DeployContract extends Command {
  static description = "Deploy contract to a running node";

  static flags = {
    account: Flags.string({
      required: true,
      description: "Alias of account to be used",
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
    await ensureSwankyProject();
    const { flags } = await this.parse(DeployContract);

    const tasks = new Listr([
      {
        title: "Initialising",
        task: async (ctx) => {
          await cryptoWaitReady();
          const config = await getSwankyConfig();
          ctx.config = config;
          const account = config.accounts.find(
            (account) => account.alias === flags.account
          );
          if (!account) {
            this.error(
              "Provided account alias not found in swanky.config.json"
            );
          }
          ctx.account = new ChainAccount(account.mnemonic);
        },
      },
      {
        title: "Getting WASM",
        task: (ctx) => {
          const buildPath = path.resolve(
            "contracts",
            flags.contract,
            "target",
            "ink"
          );
          const abi = readJSONSync(
            path.resolve(buildPath, "metadata.json")
          ) as Abi;
          const wasm = readFileSync(
            path.resolve(buildPath, `${flags.contract}.wasm`)
          );
          ctx.abi = abi;
          ctx.wasm = wasm;
        },
      },
      {
        title: "Connecting to node",
        task: async (ctx) => {
          const api = new DeployApi(ctx.config.node.nodeAddress);
          await api.start();
          ctx.api = api;
        },
      },
      {
        title: "Deploying",
        task: async (ctx) => {
          const contractAddress = await ctx.api.deploy(
            ctx.abi,
            ctx.wasm,
            ctx.account.pair,
            flags.gas,
            flags.args
          );
          ctx.contractAddress = contractAddress;
        },
      },
      {
        title: "Writing config",
        task: async (ctx) => {
          const config = await getSwankyConfig();

          if (!config.contracts) {
            config.contracts = [];
          }

          config.contracts.push({
            name: flags.contract,
            address: ctx.contractAddress,
          });

          writeJSONSync(path.resolve("swanky.config.json"), config, {
            spaces: 2,
          });
        },
      },
    ]);

    await tasks.run({});

    this.log(`Contract deployed!`);
    this.log(`Contract address: ${tasks.ctx.contractAddress}`);
  }
}

class DeployApi extends ChainApi {
  constructor(endpoint: string) {
    super(endpoint);
  }

  public async getGasCost() {}

  public async deploy(
    abi: Abi,
    wasm: Buffer,
    signerPair: KeyringPair,
    gasLimit: number,
    args: any[]
  ) {
    const code = new CodePromise(this._api, abi, wasm);
    const storageDepositLimit = null;
    const tx = code.tx.new({ gasLimit, storageDepositLimit }, ...args);
    return new Promise((resolve, reject) => {
      this.signAndSend(signerPair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const instantiateEvent = events.find(
            ({ event }) => event.method === "Instantiated"
          );

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
