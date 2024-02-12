import { Args } from "@oclif/core";
import { AccountData } from "../../types/index.js";
import { ConfigError } from "../../lib/errors.js";
import { SwankyAccountCommand } from "./swankyAccountCommands.js";

export class Faucet extends SwankyAccountCommand<typeof Faucet> {
  static description = "Transfer some tokens from faucet to an account";

  static aliases = [`account:faucet`];

  static args = {
    alias: Args.string({
      name: "alias",
      required: true,
      description: "Alias of account to be used",
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Faucet);

    const accountData = this.findAccountByAlias(args.alias);
    if (!accountData) {
      throw new ConfigError("Provided account alias not found in swanky.config.json");
    }

    await this.performFaucetTransfer(accountData);
  }

  findAccountByAlias(alias: string): AccountData | undefined {
    return this.swankyConfig.accounts.find(account => account.alias === alias);
  }
}
