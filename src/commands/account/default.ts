import { Args, Flags } from "@oclif/core";
import chalk from "chalk";
import { SwankySystemConfig } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import { getSwankyConfig, isLocalConfigCheck } from "../../lib/index.js";
import { ConfigBuilder } from "../../lib/config-builder.js";

export class DefaultAccount extends SwankyCommand<typeof DefaultAccount> {
  static description = "Set default account to use";

  static flags = {
    global: Flags.boolean({
      char: "g",
      description: "Set default account globally in Swanky system config.",
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

    const configType = flags.global ? "global" : isLocalConfigCheck() ? "local" : "global";
    const config = configType === "global" ? getSwankyConfig("global") : getSwankyConfig("local");

    const accountAlias = args.accountAlias ?? (await this.promptForAccountAlias(config));
    this.ensureAccountExists(config, accountAlias);

    const newConfig = new ConfigBuilder(config).setDefaultAccount(accountAlias).build();

    try {
      await this.storeConfig(newConfig, configType);
    } catch (cause) {
      throw new FileError(`Error storing default account in ${configType} config`, {
        cause,
      });
    }

    this.log(
      `${chalk.greenBright("✔")} Account with alias ${chalk.yellowBright(
        accountAlias
      )} set as default in ${configType} config`
    );
  }

  private async promptForAccountAlias(config: SwankySystemConfig): Promise<string> {
    const choices = config.accounts.map((account) => ({
      name: `${account.alias} (${account.address})`,
      value: account.alias,
    }));

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "defaultAccount",
        message: "Select default account",
        choices: choices,
      },
    ]);

    return answer.defaultAccount;
  }

  private ensureAccountExists(config: SwankySystemConfig, alias: string) {
    const isSomeAccount = config.accounts.some((account) => account.alias === alias);
    if (!isSomeAccount)
      throw new ConfigError(`Provided account alias ${chalk.yellowBright(alias)} not found`);
  }
}
