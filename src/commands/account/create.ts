import { Flags } from "@oclif/core";
import chalk from "chalk";
import { ChainAccount, encrypt } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyAccountCommand } from "./swankyAccountCommands.js";

export class CreateAccount extends SwankyAccountCommand<typeof CreateAccount> {
  static description = "Create a new dev account in config";

  static flags = {
    generate: Flags.boolean({
      char: "g",
    }),
    dev: Flags.boolean({
      char: "d",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CreateAccount);

    const isDev =
      flags.dev ??
      (
        await inquirer.prompt([
          { type: "confirm", message: "Is this a DEV account? ", name: "isDev", default: false },
        ])
      ).isDev;

    if (isDev) {
      console.log(
        `${chalk.redBright(
          "DEV account mnemonic will be stored in plain text. DO NOT USE IN PROD!"
        )}`
      );
    }

    let tmpMnemonic: string;
    if (flags.generate) {
      tmpMnemonic = ChainAccount.generate();
      console.log(
        `${
          isDev
            ? ""
            : chalk.yellowBright(
                "This is your mnemonic. Copy it to a secure place, as it will be encrypted and not accessible anymore."
              )
        }
        ${"-".repeat(tmpMnemonic.length)}
        ${tmpMnemonic}
        ${"-".repeat(tmpMnemonic.length)}`
      );
    } else {
      tmpMnemonic = (
        await inquirer.prompt([{ type: "input", message: "Enter mnemonic: ", name: "mnemonic" }])
      ).mnemonic;
    }

    const accountData: AccountData = {
      mnemonic: "",
      isDev,
      alias: (await inquirer.prompt([{ type: "input", message: "Enter alias: ", name: "alias" }]))
        .alias,
      address: new ChainAccount(tmpMnemonic).pair.address,
    };

    if (!isDev) {
      const password = (
        await inquirer.prompt([
          { type: "password", message: "Enter encryption password: ", name: "password" },
        ])
      ).password;
      accountData.mnemonic = encrypt(tmpMnemonic, password);
    } else {
      accountData.mnemonic = tmpMnemonic;
    }

    this.swankyConfig.accounts.push(accountData);

    await this.storeConfig();

    this.log(
      `${chalk.greenBright("✔")} Account with alias ${chalk.yellowBright(
        accountData.alias
      )} stored to config`
    );

    await this.performFaucetTransfer(accountData, true);
  }
}
