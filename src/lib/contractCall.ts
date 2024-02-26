import { AbiType, ChainAccount, ChainApi, configName, ensureAccountIsSet, decrypt, resolveNetworkUrl } from "./index.js";
import { ContractData, DeploymentData, Encrypted } from "../types/index.js";
import { Args, Command, Flags, Interfaces } from "@oclif/core";
import inquirer from "inquirer";
import chalk from "chalk";
import { SwankyCommand } from "./swankyCommand.js";
import { cryptoWaitReady } from "@polkadot/util-crypto/crypto";
import { Contract } from "./contract.js";
import { ConfigError, FileError, NetworkError } from "./errors.js";

export type JoinedFlagsType<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof ContractCall)["baseFlags"] & T["flags"]
>;

export abstract class ContractCall<T extends typeof Command> extends SwankyCommand<
  typeof ContractCall
> {
  static callArgs = {
    contractName: Args.string({
      name: "Contract name",
      description: "Contract to call",
      required: true,
    }),
    messageName: Args.string({
      name: "Message name",
      required: true,
      description: "What message to call",
    }),
  };

  static callFlags = {
    network: Flags.string({
      char: "n",
      default: "local",
      description: "Name of network to connect to",
    }),
  }

  protected flags!: JoinedFlagsType<T>;
  protected args!: Record<string, any>;
  protected contractInfo!: ContractData;
  protected deploymentInfo!: DeploymentData;
  protected account!: ChainAccount;
  protected metadata!: AbiType;
  protected api!: ChainApi;

  public async init(): Promise<void> {
    await super.init();
    const { flags, args } = await this.parse(this.ctor);
    this.args = args;
    this.flags = flags as JoinedFlagsType<T>;

    const contractRecord = this.swankyConfig.contracts[args.contractName];
    if (!contractRecord) {
      throw new ConfigError(
        `Cannot find a contract named ${args.contractName} in "${configName()}"`,
      );
    }

    const contract = new Contract(contractRecord);

    if (!(await contract.pathExists())) {
      throw new FileError(
        `Path to contract ${args.contractName} does not exist: ${contract.contractPath}`,
      );
    }

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      throw new FileError(
        `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`,
      );
    }

    const deploymentData = flags.address
      ? contract.deployments.find(
        (deployment: DeploymentData) => deployment.address === flags.address,
      )
      : contract.deployments[0];

    if (!deploymentData?.address)
      throw new NetworkError(
        `Cannot find a deployment with address: ${flags.address} in "${configName()}"`,
      );

    this.deploymentInfo = deploymentData;

    ensureAccountIsSet(flags.account, this.swankyConfig);

    const accountAlias = flags.account ?? this.swankyConfig.defaultAccount;
    const accountData = this.findAccountByAlias(flags.account || "alice");

    if (accountData.isDev && (flags.network !== "local" || !flags.network)) {
      throw new ConfigError(`Account ${chalk.redBright(accountAlias)} is a dev account and can only be used on the local network`);
    }

    const networkUrl = resolveNetworkUrl(this.swankyConfig, flags.network ?? "");
    const api = await ChainApi.create(networkUrl);
    this.api = api;
    await this.api.start();

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
        ).password,
      );

    const account = (await this.spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;
    this.account = account;

    this.metadata = (await this.spinner.runCommand(async () => {
      const abi = await contract.getABI();
      return abi;
    }, "Getting metadata")) as AbiType;
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_);
  }
}

// Static property baseFlags needs to be defined like this (for now) because of the way TS transpiles ESNEXT code
// https://github.com/oclif/oclif/issues/1100#issuecomment-1454910926
ContractCall.baseFlags = {
  ...SwankyCommand.baseFlags,
  params: Flags.string({
    required: false,
    description: "Arguments supplied to the message",
    multiple: true,
    default: [],
    char: "p",
  }),
  gas: Flags.string({
    char: "g",
    description: "Manually specify gas limit",
  }),
  network: Flags.string({
    char: "n",
    description: "Network name to connect to",
  }),
  account: Flags.string({
    char: "a",
    description: "Account alias to sign the transaction with",
  }),
  address: Flags.string({
    required: false,
    description: "Target specific address, defaults to last deployed. (--addr, --add)",
    aliases: ["addr", "add"],
  }),
};
