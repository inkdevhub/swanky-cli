import { Args, Flags } from "@oclif/core";
import { cryptoWaitReady } from "@polkadot/util-crypto/crypto";
import {
  resolveNetworkUrl,
  ChainApi,
  ChainAccount,
  decrypt,
  AbiType,
  ensureAccountIsSet,
  configName,
} from "../../lib/index.js";
import { AccountData, Encrypted } from "../../types/index.js";
import inquirer from "inquirer";
import chalk from "chalk";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ApiError, ConfigError, FileError } from "../../lib/errors.js";

export class DeployContract extends SwankyCommand<typeof DeployContract> {
  static description = "Deploy contract to a running node";

  static flags = {
    account: Flags.string({
      description: "Account alias to deploy contract with",
    }),
    gas: Flags.integer({
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
      default: "local",
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
    const { args, flags } = await this.parse(DeployContract);

    const contractRecord = this.swankyConfig.contracts[args.contractName];
    if (!contractRecord) {
      throw new ConfigError(
        `Cannot find a contract named ${args.contractName} in "${configName()}"`
      );
    }

    const contract = new Contract(contractRecord);

    if (!(await contract.pathExists())) {
      throw new FileError(
        `Path to contract ${args.contractName} does not exist: ${contract.contractPath}`
      );
    }

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      throw new FileError(
        `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
      );
    }

    ensureAccountIsSet(flags.account, this.swankyConfig);

    const accountAlias = flags.account ?? this.swankyConfig.defaultAccount;

    const accountData = this.swankyConfig.accounts.find(
      (account: AccountData) => account.alias === accountAlias
    );
    if (!accountData) {
      throw new ConfigError(`Provided account alias ${chalk.yellowBright(accountAlias)} not found in "${configName()}"`);
    }

    if (accountData.isDev && flags.network !== "local") {
      throw new ConfigError(
        `Account ${accountAlias} is a DEV account and can only be used with local network`
      );
    }

    if(this.swankyConfig.defaultAccount === null)
    {
      this.swankyConfig.defaultAccount = accountAlias;
      await this.storeConfig(this.swankyConfig, 'local');
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

    const account = (await this.spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;

    const { abi, wasm } = (await this.spinner.runCommand(async () => {
      const abi = await contract.getABI();
      const wasm = await contract.getWasm();
      return { abi, wasm };
    }, "Getting WASM")) as { abi: AbiType; wasm: Buffer };

    const networkUrl = resolveNetworkUrl(this.swankyConfig, flags.network ?? "");

    const api = (await this.spinner.runCommand(async () => {
      const api = await ChainApi.create(networkUrl);
      await api.start();
      return api;
    }, "Connecting to node")) as ChainApi;

    const contractAddress = (await this.spinner.runCommand(async () => {
      try {
        const contractAddress = await api.deploy(
          abi,
          wasm,
          flags.constructorName,
          account.pair,
          flags.args!,
          flags.gas
        );
        return contractAddress;
      } catch (cause) {
        throw new ApiError("Error deploying", { cause });
      }
    }, "Deploying")) as string;

    await this.spinner.runCommand(async () => {
      contractRecord.deployments = [
        ...contractRecord.deployments,
        {
          timestamp: Date.now(),
          address: contractAddress,
          networkUrl,
          deployerAlias: accountAlias!,
        },
      ];

      await this.storeConfig(this.swankyConfig, 'local');
    }, "Writing config");

    this.log(`Contract deployed!`);
    this.log(`Contract address: ${contractAddress}`);
  }
}
