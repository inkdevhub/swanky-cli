import { Args } from "@oclif/core";
import { ChainApi, resolveNetworkUrl } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ApiError, ConfigError } from "../../lib/errors.js";
import { LOCAL_FAUCET_AMOUNT } from "../../lib/consts.js";

export class Faucet extends SwankyCommand<typeof Faucet> {
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

    const accountData = this.swankyConfig.accounts.find(
      (account: AccountData) => account.alias === args.alias
    );
    if (!accountData) {
      throw new ConfigError("Provided account alias not found in swanky.config.json");
    }

    const networkUrl = resolveNetworkUrl(this.swankyConfig, "");

    const api = (await this.spinner.runCommand(async () => {
      const api = await ChainApi.create(networkUrl);
      await api.start();
      return api;
    }, "Connecting to node")) as ChainApi;

    await this.spinner.runCommand(
      async () => {
        try {
          await api.faucet(accountData);
        } catch (cause) {
          throw new ApiError("Error transferring tokens from faucet account", { cause });
        }
      },
      `Transferring ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${args.alias}`,
      `Transferred ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${args.alias}`,
      `Failed to transfer ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${args.alias}`,
      true
    );
  }
}
