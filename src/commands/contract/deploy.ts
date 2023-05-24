import { Args, Command, Flags } from "@oclif/core";
import path = require("node:path");
import { writeJSON } from "fs-extra";
import { cryptoWaitReady } from "@polkadot/util-crypto/crypto";
import {
  ensureSwankyProject,
  getSwankyConfig,
  resolveNetworkUrl,
  DeployApi,
  ChainAccount,
  Spinner,
  decrypt,
  AbiType,
} from "../../lib/index.js";
import { AccountData, Encrypted } from "../../types/index.js";
import inquirer from "inquirer";
import chalk = require("chalk");
import { Contract } from "../../lib/contract.js";

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
    constructorName: Flags.string({
      default: "new",
      char: "c",
      description: "Constructor function name of a contract to deploy",
    }),
    network: Flags.string({
      char: "n",
      description: "Network name to connect to",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract to deploy",
    }),
  };

  async run(): Promise<void> {
    await ensureSwankyProject();
    const { args, flags } = await this.parse(DeployContract);

    const config = await getSwankyConfig();

    const spinner = new Spinner();

    const contractRecord = config.contracts[args.contractName];
    if (!contractRecord) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const contract = new Contract(contractRecord);

    if (!(await contract.pathExists())) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contract.contractPath}`);
    }

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      this.error(`No artifact file found at path: ${artifactsCheck.missingPaths}`);
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
      const abi = await contract.getABI();
      const wasm = await contract.getWasm();
      return { abi, wasm };
    }, "Getting WASM")) as { abi: AbiType; wasm: Buffer };

    const networkUrl = resolveNetworkUrl(config, flags.network ?? "");

    const api = (await spinner.runCommand(async () => {
      const api = new DeployApi(networkUrl);
      await api.start();
      return api;
    }, "Connecting to node")) as DeployApi;

    const contractAddress = (await spinner.runCommand(async () => {
      try {
        const contractAddress = await api.deploy(
          abi,
          wasm,
          flags.constructorName,
          account.pair,
          flags.gas,
          flags.args as string[]
        );
        return contractAddress;
      } catch (e) {
        console.error(e);
        throw new Error("Error deploying!");
      }
    }, "Deploying")) as string;

    await spinner.runCommand(async () => {
      contractRecord.deployments = [
        ...contractRecord.deployments,
        {
          timestamp: Date.now(),
          address: contractAddress,
          networkUrl,
          deployerAlias: flags.account,
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
