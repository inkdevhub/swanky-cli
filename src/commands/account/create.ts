import { Command, Flags } from "@oclif/core";
import chalk = require("chalk");
import { writeJSON } from "fs-extra";
import { ChainAccount } from "../../lib/account";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";
import { encrypt } from "../../lib/crypto";
import inquirer from "inquirer";
export class CreateAccount extends Command {
  static description = "Create a new dev account in config";

  static flags = {
    generate: Flags.boolean({
      char: "g",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    await ensureSwankyProject();
    const { flags } = await this.parse(CreateAccount);

    let tmpMnemonic = "";
    if (flags.generate) {
      tmpMnemonic = ChainAccount.generate();
    } else {
      const answers: { mnemonic: string } = await inquirer.prompt([
        { type: "input", message: "Enter mnemonic: ", name: "mnemonic" },
      ]);

      tmpMnemonic = answers.mnemonic;
    }

    const answers: { alias: string; password: string } = await inquirer.prompt([
      { type: "input", message: "Enter alias: ", name: "alias" },
      { type: "password", message: "Enter encryption password: ", name: "password" },
    ]);

    const accountData = {
      mnemonic: encrypt(tmpMnemonic, answers.password),
      alias: answers.alias,
      isDev: false,
    };
    const config = await getSwankyConfig();

    config.accounts.push(accountData);

    await writeJSON("swanky.config.json", config, { spaces: 2 });

    this.log(
      `${chalk.greenBright("✔")} Account with alias ${chalk.yellowBright(
        accountData.alias
      )} stored to config`
    );
  }
}
