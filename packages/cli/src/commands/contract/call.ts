import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ContractPromise } from "@polkadot/api-contract";
import {
  AccountData,
  ChainAccount,
  ChainApi,
  decrypt,
  Encrypted,
  getSwankyConfig,
  resolveNetworkUrl,
  Spinner,
  AbiType as Abi,
} from "@astar-network/swanky-core";
import inquirer from "inquirer";
import chalk = require("chalk");
import { readJSON } from "fs-extra";

export class CallContract extends Command {
  static description = "Call a method on a smart contract";

  static flags = {
    // args: Flags.string({
    //   required: false,
    //   char: "a",
    // }),
    contractName: Flags.string({
      required: true,
    }),
    account: Flags.string({
      char: "a",
      required: true,
    }),
    // message: Flags.string({
    //   required: true,
    //   char: "m",
    // }),
    dry: Flags.boolean({
      char: "d",
    }),
    gas: Flags.string({
      char: "g",
    }),
    network: Flags.string({
      char: "n",
      description: "Network name to connect to",
    }),
    deploymentTimestamp: Flags.integer({
      char: "t",
      required: false,
      description: "Specific deployment to target",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(CallContract);
    const config = await getSwankyConfig();
    const spinner = new Spinner();

    const contractInfo = config.contracts[flags.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${flags.contractName} in swanky.config.json`);
    }

    const deploymentData = flags.deploymentTimestamp
      ? contractInfo.deployments.find(
          (deployment) => deployment.timestamp === flags.deploymentTimestamp
        )
      : contractInfo.deployments[0];

    if (!deploymentData?.address)
      throw new Error(
        `Deployment with timestamp ${deploymentData?.timestamp} has no deployment address!`
      );

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

    const networkUrl = resolveNetworkUrl(config, flags.network ?? "");

    const api = new ChainApi(networkUrl);

    await api.start();

    const account = (await spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;

    const metadata = (await spinner.runCommand(async () => {
      if (!contractInfo.build) {
        this.error(`No build info found for contract named ${flags.contractName}`);
      }
      const metadata = await readJSON(
        path.resolve(contractInfo.build.artifactsPath, `${flags.contractName}.json`)
      );
      return metadata;
    }, "Getting metadata")) as Abi;
    const contract = new ContractPromise(api.apiInst, metadata, deploymentData.address);

    const gasLimit = 3000n * 10000000n;
    const storageDepositLimit = null;

    const result = await contract.query.get(account.pair.address, {
      gasLimit,
      storageDepositLimit,
    });

    console.log(result);
    console.log(result.gasRequired.toHuman());
    console.log(result.result.toHuman());

    await api.apiInst.disconnect();
  }
}
