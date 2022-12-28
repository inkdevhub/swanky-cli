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

  static args = [
    {
      name: "contractName",
      required: true,
      description: "Name of the contract to call",
    },
    {
      name: "messageType",
      required: true,
      description: "Is the call a query or tx type",
      options: ["q", "query", "tx"],
    },
  ];

  static flags = {
    params: Flags.string({
      required: false,
      description: "Arguments supplied to the message",
      multiple: true,
      default: [],
      char: "p",
    }),
    account: Flags.string({
      required: true,
      char: "a",
      description: "Account to sign the transaction with",
    }),
    message: Flags.string({
      required: true,
      char: "m",
      description: "Message name to call",
    }),
    dry: Flags.boolean({
      char: "d",
      description: "Do a dry run, without signing the transaction (only for tx type of message)",
    }),
    gas: Flags.string({
      char: "g",
      description: "Manually specify gas limit",
    }),
    network: Flags.string({
      char: "n",
      description: "Network name to connect to",
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Display more info in the result logs",
    }),
  };

  async run(): Promise<void> {
    const { flags, args } = await this.parse(CallContract);

    // for convenience, so we don't need to check for both
    if (args.messageType === "q") args.messageType = "query";

    const config = await getSwankyConfig();
    const spinner = new Spinner();

    const contractInfo = config.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
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
    console.log("AAAA", flags.params);
    const api = new ChainApi(networkUrl);
    await api.start();

    const account = (await spinner.runCommand(async () => {
      await cryptoWaitReady();
      return new ChainAccount(mnemonic);
    }, "Initialising")) as ChainAccount;

    const metadata = (await spinner.runCommand(async () => {
      if (!contractInfo.build) {
        this.error(`No build info found for contract named ${args.contractName}`);
      }
      const metadata = await readJSON(
        path.resolve(contractInfo.build.artifactsPath, `${args.contractName}.json`)
      );
      return metadata;
    }, "Getting metadata")) as Abi;

    const contract = new ContractPromise(api.apiInst, metadata, deploymentData.address);

    const storageDepositLimit = null;

    const queryResult = await contract.query[flags.message](
      account.pair.address,
      {
        gasLimit: -1,
        storageDepositLimit,
      },
      ...flags.params
    );

    if (args.messageType === "query") {
      console.log(`Query result:`);
      console.log(queryResult.result.toHuman());
      api.apiInst.disconnect();
    } else {
      this.log(`Gas required: ${queryResult.gasRequired.toHuman()}`);
      if (flags.dry) {
        this.log(`Dry run result: ${queryResult.result.toHuman()}`);
        await api.apiInst.disconnect();
      }
      const customGas = flags.gas ? BigInt(flags.gas) : null;
      await contract.tx[flags.message](
        {
          storageDepositLimit,
          gasLimit: customGas || queryResult.gasRequired,
        },
        ...flags.params
      ).signAndSend(account.pair, async (result) => {
        if (result.status.isInBlock) {
          console.log("Tx result:");
          if (flags.verbose) {
            console.log(JSON.stringify(result.toHuman(), null, 2));
          } else {
            console.log(result.toHuman());
          }
          return await api.apiInst.disconnect();
        }
        // needed to trigger a new event
        await contract.query[flags.message](account.pair.address, {
          gasLimit: -1,
          storageDepositLimit,
        });
      });
    }
  }
}
