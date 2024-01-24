import { Args, Flags } from "@oclif/core";
import chalk from "chalk";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";
import { isLocalConfigCheck } from "../../lib/index.js";
export class DefaultAccount extends SwankyCommand<typeof DefaultAccount> {
  static description = "Set default account to use";

  static flags = {
    global: Flags.boolean({
      char: "g",
      description: "Set default account globally",
    }),
  }

  static args = {
    accountAlias: Args.string({
      name: "accountAlias",
      required: false,
      description: "Alias of account to be used as default",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DefaultAccount);

    if(args.accountAlias) {
      const accountData = this.swankyConfig.accounts.find(
        (account: AccountData) => account.alias === args.accountAlias
      );
      if (!accountData) {
        throw new ConfigError("Provided account alias not found in swanky.config.json");
      }
      this.swankyConfig.defaultAccount = accountData.alias;
    } else {
      await inquirer.prompt([
        {
          type: "list",
          name: "defaultAccount",
          message: "Select default account",
          choices: this.swankyConfig.accounts.map((account: AccountData) => {
            return {
              name: `${account.alias} (${account.address})`,
              value: account.alias,
            };
          }),
        },
      ]).then((answers) => {
        this.swankyConfig.defaultAccount = answers.defaultAccount;
      });
    }

    if(flags.global) {
      await this.storeSystemConfig();
    }
    else if(isLocalConfigCheck()) {
      await this.storeConfig(process.cwd());
    } else {
      throw new Error("Cannot store account to config. Please run this command in a swanky project directory");
    }

    console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(this.swankyConfig.defaultAccount)}`));
  }
}
