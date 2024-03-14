import { Flags } from "@oclif/core";
import chalk from "chalk";
import { ChainAccount, encrypt, getSwankyConfig, isLocalConfigCheck, SwankyAccountCommand } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { FileError } from "../../lib/errors.js";
import { ConfigBuilder } from "../../lib/config-builder.js";

export class CreateAccount extends SwankyAccountCommand<typeof CreateAccount> {
  static description = "Create a new dev account in config";

  static flags = {
    global: Flags.boolean({
      char: "g",
      description: "Create account globally stored in Swanky system config.",
      
    }),
    new: Flags.boolean({
      char: "n",
      description: "Generate a brand new account.",
    }),
    dev: Flags.boolean({
      char: "d",
      description: "Make this account a dev account for local network usage.",
    }),
  };

  constructor(argv: string[], baseConfig: any) {
    super(argv, baseConfig);
    (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG = false;
  }

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

    let tmpMnemonic = "";
    if (flags.new) {
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

    const configType = flags.global ? "global" : isLocalConfigCheck() ? "local" : "global";
    const config = configType === "global" ? getSwankyConfig("global") : getSwankyConfig("local");

    const configBuilder = new ConfigBuilder(config).addAccount(accountData);

    if (config.defaultAccount === null) {
      configBuilder.setDefaultAccount(accountData.alias);
    }

    try {
      await this.storeConfig(configBuilder.build(), configType);
    } catch (cause) {
      throw new FileError(`Error storing created account in ${configType} config`, {
        cause,
      });
    }

    this.log(
      `${chalk.greenBright("✔")} Account with alias ${chalk.yellowBright(
        accountData.alias
      )} stored to config`
    );

    await this.performFaucetTransfer(accountData, true);
  }
}
