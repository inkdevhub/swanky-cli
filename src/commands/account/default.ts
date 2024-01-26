import { Args, Flags } from "@oclif/core";
import chalk from "chalk";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import { isLocalConfigCheck, configName } from "../../lib/index.js";
export class DefaultAccount extends SwankyCommand<typeof DefaultAccount> {
  static description = "Set default account to use";

  static flags = {
    global: Flags.boolean({
      char: "g",
      description: "Set default account globally: stored in both Swanky system and local configs.",
    }),
  }

  static args = {
    accountAlias: Args.string({
      name: "accountAlias",
      required: false,
      description: "Alias of account to be used as default",
    }),
  };

  constructor(argv: string[], baseConfig: any) {
    super(argv, baseConfig);
    (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG = false;
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DefaultAccount);

    if(args.accountAlias) {
      const accountData = this.swankyConfig.accounts.find(
        (account: AccountData) => account.alias === args.accountAlias
      );
      if (!accountData) {
        throw new ConfigError(`Provided account alias not found in "${configName()}"`);
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

    try {
      if (isLocalConfigCheck()) {
        await this.storeConfig(process.cwd());
        if (flags.global) {
          await this.storeSystemConfig();
        }
      } else {
        await this.storeSystemConfig();
      }
    } catch (cause) {
      throw new FileError("Error storing created account in config", { cause });
    }

    console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(this.swankyConfig.defaultAccount)}`));
  }
}
