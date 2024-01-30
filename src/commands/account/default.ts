import { Args, Flags } from "@oclif/core";
import chalk from "chalk";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";
import { configName, getSwankySystemConfig, isEnvConfigCheck, isLocalConfigCheck } from "../../lib/index.js";

export class DefaultAccount extends SwankyCommand<typeof DefaultAccount> {
  static description = "Set default account to use";

  static flags = {
    global: Flags.boolean({
      char: "g",
      description: "Set default account globally: stored in both Swanky system and local configs.",
    }),
  };

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

    const systemConfig = await getSwankySystemConfig();

    if (args.accountAlias) {
      const accountData = this.swankyConfig.accounts.find(
        (account: AccountData) => account.alias === args.accountAlias,
      );
      const systemAccountData = systemConfig.accounts.find(
        (account: AccountData) => account.alias === args.accountAlias,
      );
      if (isLocalConfigCheck()) {
        if (!accountData) {
          if (!isEnvConfigCheck() || flags.global) {
            if (!systemAccountData) {
              throw new ConfigError(`Provided account alias ${chalk.yellowBright(args.accountAlias)} not found in "${configName()}" and system config`);
            }
            systemConfig.defaultAccount = systemAccountData.alias;
            await this.storeSystemConfig(systemConfig);
            console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(systemConfig.defaultAccount)} in system config`));
          } else {
            throw new ConfigError(`Provided account alias ${chalk.yellowBright(args.accountAlias)} not found in "${configName()}"`);
          }
        } else {
          this.swankyConfig.defaultAccount = accountData.alias;
          await this.storeConfig(process.cwd());
          if (flags.global) {
            if (!systemAccountData) {
              throw new ConfigError(`Provided account alias ${chalk.yellowBright(args.accountAlias)} not found in system config`);
            }
            systemConfig.defaultAccount = accountData.alias;
            await this.storeSystemConfig(systemConfig);
          }
          console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(this.swankyConfig.defaultAccount)}`));
        }
      } else {
        if (!accountData) {
          throw new ConfigError(`Provided account alias ${chalk.yellowBright(args.accountAlias)} not found in system config`);
        }
        this.swankyConfig.defaultAccount = accountData.alias;
        await this.storeSystemConfig();
        console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(this.swankyConfig.defaultAccount)} in system config`));
      }
    } else {
      const choices = this.swankyConfig.accounts.map((account: AccountData) => {
        return {
          name: `${account.alias} (${account.address})`,
          value: { alias: account.alias, systemConfig: false },
        };
      });
      if (!isEnvConfigCheck() || flags.global) {
        systemConfig.accounts.forEach((account: AccountData) => {
          if (!choices.find((choice: any) => choice.value.alias === account.alias)) {
            choices.push({
              name: `${account.alias} (${account.address}) [system config]`,
              value: { alias: account.alias, systemConfig: true },
            });
          }
        });
      }
      await inquirer.prompt([
        {
          type: "list",
          name: "defaultAccount",
          message: "Select default account",
          choices: choices,
        },
      ]).then((answers) => {
        if (answers.defaultAccount.systemConfig) {
          systemConfig.defaultAccount = answers.defaultAccount.alias;
          this.storeSystemConfig(systemConfig);
          console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(systemConfig.defaultAccount)} in system config`));
        } else {
          this.swankyConfig.defaultAccount = answers.defaultAccount.alias;
          this.storeConfig(process.cwd());
          if (flags.global) {
            const systemAccountData = systemConfig.accounts.find(
              (account: AccountData) => account.alias === answers.defaultAccount.alias,
            );
            if (!systemAccountData) {
              throw new ConfigError(`Provided account alias ${chalk.yellowBright(answers.defaultAccount.alias)} not found in system config`);
            }
            systemConfig.defaultAccount = answers.defaultAccount.alias;
            this.storeSystemConfig(systemConfig);
          }
          console.log(chalk.greenBright(`Default account set to ${chalk.yellowBright(this.swankyConfig.defaultAccount)}`));
        }
      });
    }
  }
}
