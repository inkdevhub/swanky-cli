import { Args } from "@oclif/core";
import { SwankyAccountCommand } from "../../lib/index.js";

export class Faucet extends SwankyAccountCommand<typeof Faucet> {
  static description = "Transfer some tokens from faucet to an account";

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
    await this.performFaucetTransfer(accountData);
  }
}
