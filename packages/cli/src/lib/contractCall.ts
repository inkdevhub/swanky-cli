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
import { Command, Flags, Interfaces } from "@oclif/core";
import inquirer from "inquirer";
import chalk = require("chalk");
import { BaseCommand } from "./baseCommand";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { readJSON } from "fs-extra";

export type JoinedFlagsType<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"] & typeof ContractCall["globalFlags"] & T["flags"]
>;

export abstract class ContractCall<T extends typeof Command> extends BaseCommand<
  typeof ContractCall
> {
  // define flags that can be inherited by any command that extends BaseCommand
  static globalFlags = {
    ...BaseCommand.globalFlags,
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
    deploymentTimestamp: Flags.integer({
      char: "t",
      required: false,
      description: "Specific deployment to target",
    }),
  };

  static callArgs = [
    { name: "contractName", description: "Contract to call", required: true },
    {
      name: "messageName",
      required: true,
      description: "What message to call",
    },
  ];

  protected flags!: JoinedFlagsType<T>;
  protected args!: { [name: string]: any };
  protected contractInfo!: ContractData;
  protected deploymentInfo!: DeploymentData;
  protected account!: ChainAccount;
  protected metadata!: AbiType;
  protected api!: ChainApi;

  public async init(): Promise<void> {
    await super.init();
    const { flags, args } = await this.parse(this.constructor as Interfaces.Command.Class);
    this.flags = flags;
    this.args = args;
    const contractInfo = this.swankyConfig.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }
    this.contractInfo = contractInfo;

    const deploymentData = flags.deploymentTimestamp
      ? contractInfo.deployments.find(
          (deployment) => deployment.timestamp === flags.deploymentTimestamp
        )
      : contractInfo.deployments[0];

    if (!deploymentData?.address)
      throw new Error(
        `Deployment with timestamp ${deploymentData?.timestamp} has no deployment address!`
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
