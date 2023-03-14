import {
  AbiType,
  AccountData,
  ChainAccount,
  ChainApi,
  ContractData,
  decrypt,
  DeploymentData,
  Encrypted,
  resolveNetworkUrl,
} from "@astar-network/swanky-core";
import path = require("node:path");
import { Args, Command, Flags, Interfaces } from "@oclif/core";
import inquirer from "inquirer";
import chalk = require("chalk");
import { BaseCommand } from "./baseCommand";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { readJSON } from "fs-extra";

export type JoinedFlagsType<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["baseFlags"] & typeof ContractCall["baseFlags"] & T["flags"]
>;

export abstract class ContractCall<T extends typeof Command> extends BaseCommand<
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

  protected flags!: JoinedFlagsType<T>;
  protected args!: { [name: string]: any };
  protected contractInfo!: ContractData;
  protected deploymentInfo!: DeploymentData;
  protected account!: ChainAccount;
  protected metadata!: AbiType;
  protected api!: ChainApi;

  public async init(): Promise<void> {
    await super.init();
    // const { flags, args } = await this.parse(this.constructor as Interfaces.Command.Class);
    const { flags, args } = await this.parse(this.ctor);
    // this.flags = flags as JoinedFlagsType<typeof ContractCall>;
    this.args = args;
    const contractInfo = this.swankyConfig.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }
    this.contractInfo = contractInfo;

    const deploymentData = flags.address
      ? contractInfo.deployments.find((deployment) => deployment.address === flags.address)
      : contractInfo.deployments[0];

    if (!deploymentData?.address)
      throw new Error(
        `Cannot find a deployment with address: ${flags.address} in swanky.config.json`
      );
    this.deploymentInfo = deploymentData;

    const accountData = this.swankyConfig.accounts.find(
      (account: AccountData) => account.alias === flags.account || "alice"
    );
    if (!accountData) {
      this.error("Provided account alias not found in swanky.config.json");
    }

    const networkUrl = resolveNetworkUrl(this.swankyConfig, flags.network ?? "");
    const api = new ChainApi(networkUrl);
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
          ).password
        );

    const account = (await this.spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;
    this.account = account;

    const metadata = (await this.spinner.runCommand(async () => {
      if (!contractInfo.build) {
        this.error(`No build info found for contract named ${args.contractName}`);
      }
      const metadata = await readJSON(
        path.resolve(contractInfo.build.artifactsPath, `${args.contractName}.json`)
      );
      return metadata;
    }, "Getting metadata")) as AbiType;
    this.metadata = metadata;
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
  ...BaseCommand.baseFlags,
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
    description: "Account to sign the transaction with",
  }),
  address: Flags.string({
    required: false,
    description: "Target specific address, defaults to last deployed. (--addr, --add)",
    aliases: ["addr", "add"],
  }),
};
