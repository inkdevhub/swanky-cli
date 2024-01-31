import { Flags } from "@oclif/core";
import chalk from "chalk";
import { ChainAccount, encrypt, isLocalConfigCheck } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { FileError } from "../../lib/errors.js";
import { ConfigBuilder } from "../../lib/config-builder.js";
export class CreateAccount extends SwankyCommand<typeof CreateAccount> {
  static description = "Create a new dev account in config";

  static flags = {
    global: Flags.boolean({
      description: "Create account globally: stored in both Swanky system and local configs.",
    }),
    generate: Flags.boolean({
      char: "g",
    }),
    dev: Flags.boolean({
      char: "d",
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

    const configBuilder = new ConfigBuilder(this.swankyConfig);
    configBuilder.addAccount(accountData);

    if (this.swankyConfig.defaultAccount === null) {
      configBuilder.setDefaultAccount(accountData.alias);
    }

    const updatedConfig = configBuilder.build();

    try {
      if (isLocalConfigCheck()) {
        await this.storeConfig(updatedConfig, 'local', process.cwd());
        if (flags.global) {
          await this.storeConfig(updatedConfig, 'global');
        }
      } else {
        await this.storeConfig(updatedConfig, 'global');
      }
    } catch (cause) {
      throw new FileError("Error storing created account in config", { cause });
    }

    this.log(
      `${chalk.greenBright("✔")} Account with alias ${chalk.yellowBright(
        accountData.alias
      )} stored to config`
    );
  }
}
