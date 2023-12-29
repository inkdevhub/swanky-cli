import { Args } from "@oclif/core";
import chalk from "chalk";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";
export class DefaultAccount extends SwankyCommand<typeof DefaultAccount> {
  static description = "Set default account to use";

  static args = {
    accountAlias: Args.string({
      name: "accountAlias",
      required: false,
      description: "Alias of account to be used as default",
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(DefaultAccount);

    let defaultAccount = "";

    if(args.accountAlias) {
      const accountData = this.swankyConfig.accounts.find(
        (account: AccountData) => account.alias === args.accountAlias
      );
      if (!accountData) {
        throw new ConfigError("Provided account alias not found in swanky.config.json");
      }
      defaultAccount = accountData.alias;
    } else {
      inquirer.prompt([
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
        defaultAccount = answers.defaultAccount;
      });
    }
    this.defaultAccount = defaultAccount;
    this.swankyConfig.accounts = this.swankyConfig.accounts.map((account: AccountData) => {
      if (account.alias === defaultAccount) {
        return {
          ...account,
          default: true,
        };
      }
      return {
        ...account,
        default: false,
      };
    });
    await this.storeSystemConfig();
    console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(defaultAccount)}`));
  }
}
