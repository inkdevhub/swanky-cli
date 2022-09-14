import { Command, Flags } from "@oclif/core";
import chalk = require("chalk");
import { writeJSON } from "fs-extra";
import { ChainAccount } from "../../lib/account";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";
import { choice } from "../../lib/prompts";
import inquirer from "inquirer";
export class CreateAccount extends Command {
  static description = "Create a new dev account in config";

  static flags = {
    force: Flags.boolean({
      char: "f",
    }),
    generate: Flags.boolean({
      char: "g",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    await ensureSwankyProject();
    const { flags } = await this.parse(CreateAccount);

    if (!(flags.force || flags.generate)) {
      const answers = await inquirer.prompt([
        choice(
          "confirmDevAcc",
          `${chalk.yellowBright(
            "WARNING: Only store test accounts this way. Mnemonic will be stored in the config file."
          )}
    Are you sure you want to proceed?`
        ),
      ]);
      if (!answers.confirmDevAcc) this.exit();
    }

    const accountData = {
      mnemonic: "",
      alias: "",
    };

    if (flags.generate) {
      const mnemonic = ChainAccount.generate();
      const alias = mnemonic.replace(/ .*/, "");
      accountData.mnemonic = mnemonic;
      accountData.alias = alias;
    } else {
      const answers: { alias: string; mnemonic: string } = await inquirer.prompt([
        { type: "input", message: "Enter mnemonic: ", name: "mnemonic" },
        { type: "input", message: "Enter alias: ", name: "alias" },
      ]);
      accountData.alias = answers.alias;
      accountData.mnemonic = answers.mnemonic;
    }

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
