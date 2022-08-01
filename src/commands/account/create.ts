import { Command, Flags } from "@oclif/core";
import { yellowBright, greenBright } from "chalk";
import { prompt } from "enquirer";
import { writeFileSync } from "fs-extra";
import { ChainAccount } from "../../lib/account";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";

export class CreateAccount extends Command {
  static description = "Deploy contract to a running node";

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
    const confirmation: { confirmed: boolean } = await prompt([
      {
        type: "confirm",
        message: `${yellowBright(
          "WARNING: Only store test accounts this way. Mnemonic will be stored in the config file."
        )}
      Are you sure you want to proceed?`,
        name: "confirmed",
        skip: flags.force || flags.generate,
      },
    ]);

    if (!confirmation.confirmed && !(flags.force || flags.generate))
      this.exit();

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
      const answers: { alias: string; mnemonic: string } = await prompt([
        { type: "input", message: "Enter mnemonic: ", name: "mnemonic" },
        { type: "input", message: "Enter alias: ", name: "alias" },
      ]);
      accountData.alias = answers.alias;
      accountData.mnemonic = answers.mnemonic;
    }

    const config = await getSwankyConfig();

    config.accounts.push(accountData);

    writeFileSync("swanky.config.json", JSON.stringify(config, null, 2));

    this.log(
      `${greenBright("✔")} Account with alias ${yellowBright(
        accountData.alias
      )} stored to config`
    );
  }
}
