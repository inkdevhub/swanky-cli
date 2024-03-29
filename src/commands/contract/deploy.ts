import { Args, Flags } from "@oclif/core";
import { cryptoWaitReady } from "@polkadot/util-crypto/crypto";
import {
  AbiType,
  ChainAccount,
  ChainApi,
  decrypt,
  resolveNetworkUrl,
  ensureAccountIsSet,
  getSwankyConfig,
  findContractRecord,
} from "../../lib/index.js";
import { BuildMode, Encrypted, SwankyConfig } from "../../types/index.js";
import inquirer from "inquirer";
import chalk from "chalk";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ApiError, ProcessError } from "../../lib/errors.js";
import { ConfigBuilder } from "../../lib/config-builder.js";
import {
  contractFromRecord,
  ensureArtifactsExist,
  ensureDevAccountNotInProduction,
} from "../../lib/checks.js";

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

    const localConfig = getSwankyConfig("local") as SwankyConfig;

    const contractRecord = findContractRecord(localConfig, args.contractName);

    const contract = await contractFromRecord(contractRecord);

    await ensureArtifactsExist(contract);

    if (contract.buildMode === undefined) {
      throw new ProcessError(
        `Build mode is undefined for contract ${args.contractName}. Please ensure the contract is correctly compiled.`
      );
    } else if (contract.buildMode !== BuildMode.Verifiable) {
      await inquirer
        .prompt([
          {
            type: "confirm",
            message: `You are deploying a not verified contract in ${
              contract.buildMode === BuildMode.Release ? "release" : "debug"
            } mode. Are you sure you want to continue?`,
            name: "confirm",
          },
        ])
        .then((answers) => {
          if (!answers.confirm) {
            this.log(
              `${chalk.redBright("✖")} Aborted deployment of ${chalk.yellowBright(
                args.contractName
              )}`
            );
            process.exit(0);
          }
        });
    }

    ensureAccountIsSet(flags.account, this.swankyConfig);

    const accountAlias = (flags.account ?? this.swankyConfig.defaultAccount)!;

    const accountData = this.findAccountByAlias(accountAlias);

    ensureDevAccountNotInProduction(accountData, flags.network);

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
      const deploymentData = {
        timestamp: Date.now(),
        address: contractAddress,
        networkUrl,
        deployerAlias: accountAlias,
      };
      const newLocalConfig = new ConfigBuilder(localConfig)
        .addContractDeployment(args.contractName, deploymentData)
        .build();
      await this.storeConfig(newLocalConfig, "local");
    }, "Writing config");

    this.log(`Contract deployed!`);
    this.log(`Contract address: ${contractAddress}`);
  }
}
