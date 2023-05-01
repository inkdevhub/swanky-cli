import { ApiPromise, WsProvider } from "@polkadot/api";

// `swanky script run 00_deploy` will run this script.

// User-defined script to run.
// This is just an deploy contract example, you can change it freely.

import {
    getSwankyConfig,
    AccountData,
    ChainAccount,
    Encrypted,
    decrypt,
    resolveNetworkUrl
} from "@astar-network/swanky-core";
import FlipperFactory from "../typedContracts/flipper/constructors/flipper";
import Flipper from "../typedContracts/flipper/contracts/flipper";
import inquirer from "inquirer";
import chalk from "chalk";

// Change account alias to use
const accountName = "alice";

// Change network name to deploy to
const networkName = "local";

async function main() {
    const config = await getSwankyConfig();

    // Keyring settings
    const accountData = config.accounts.find(
        (account: AccountData) => account.alias === accountName
    );
    if (!accountData) {
        throw new Error("Provided account alias not found in swanky.config.json");
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

    const deployer = new ChainAccount(mnemonic).pair;

    // Network settings
    const networkUrl = resolveNetworkUrl(config, networkName ?? "");
    const wsProvider = new WsProvider(networkUrl);
    const api = await ApiPromise.create({ provider: wsProvider });

    // Deploy flipper contract whose initial state is set to `true`.
    const flipperFactory = new FlipperFactory(api, deployer);
    const initialState = true;

    const contract = new Flipper(
      (await flipperFactory.new(initialState)).address,
      deployer,
      api
    );

    console.log(`Flipper with initial state \`true\` deployed to ${contract.address}`);

    await api.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
