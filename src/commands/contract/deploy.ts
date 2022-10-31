import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { CodePromise, Abi } from "@polkadot/api-contract";
import { readJSON, readFile, writeJSON } from "fs-extra";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ChainApi } from "../../lib/substrate-api";
import { KeyringPair } from "@polkadot/keyring/types";
import { ensureSwankyProject, getSwankyConfig, resolveNetworkUrl } from "../../lib/command-utils";
import { ChainAccount } from "../../lib/account";
import { Spinner } from "../../lib/spinner";
import inquirer from "inquirer";
import { decrypt } from "../../lib/crypto";
import { AccountData, Encrypted } from "../../types";
import chalk = require("chalk");

export class DeployContract extends Command {
  static description = "Deploy contract to a running node";

  static flags = {
    account: Flags.string({
      required: true,
      description: "Alias of account to be used",
    }),
    gas: Flags.integer({
      required: true,
      char: "g",
    }),
    args: Flags.string({
      char: "a",
      multiple: true,
    }),
    network: Flags.string({
      char: "n",
      description: "Network name to connect to",
    }),
  };

  static args = [
    {
      name: "contractName",
      required: true,
      description: "Name of the contract to deploy",
    },
  ];

  async run(): Promise<void> {
    await ensureSwankyProject();
    const { args, flags } = await this.parse(DeployContract);

    const config = await getSwankyConfig();

    const spinner = new Spinner();

    const contractInfo = config.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const accountData = config.accounts.find(
      (account: AccountData) => account.alias === flags.account
    );
    if (!accountData) {
      this.error("Provided account alias not found in swanky.config.json");
    }

    const mnemonic = accountData.isDev
      ? (accountData.mnemonic as string)
      : decrypt(
          accountData.mnemonic as Encrypted,
          (
            await inquirer.prompt([
              {
                type: "password",
                message: `Enter password for ${chalk.yellowBright(accountData.alias)}: `,
                name: "password",
              },
            ])
          ).password
        );

    const account = (await spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;

    const { abi, wasm } = (await spinner.runCommand(async () => {
      if (!contractInfo.build) {
        this.error(`No build info found for contract named ${args.contractName}`);
      }
      const abi = (await readJSON(
        path.resolve(contractInfo.build.artefactsPath, "metadata.json")
      )) as Abi;
      const wasm = await readFile(
        path.resolve(contractInfo.build.artefactsPath, `${args.contractName}.wasm`)
      );
      return { abi, wasm };
    }, "Getting WASM")) as { abi: Abi; wasm: Buffer };

    const api = (await spinner.runCommand(async () => {
      const api = new DeployApi(resolveNetworkUrl(config, flags.network ?? ""));
      await api.start();
      return api;
    }, "Connecting to node")) as DeployApi;

    const contractAddress = (await spinner.runCommand(async () => {
      const contractAddress = await api.deploy(
        abi,
        wasm,
        account.pair,
        flags.gas,
        flags.args as string[]
      );
      return contractAddress;
    }, "Deploying")) as string;

    await spinner.runCommand(async () => {
      contractInfo.deployments = [
        ...contractInfo.deployments,
        {
          timestamp: Date.now(),
          address: contractAddress,
        },
      ];

      await writeJSON(path.resolve("swanky.config.json"), config, {
        spaces: 2,
      });
    }, "Writing config");

    this.log(`Contract deployed!`);
    this.log(`Contract address: ${contractAddress}`);
  }
}

class DeployApi extends ChainApi {
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
