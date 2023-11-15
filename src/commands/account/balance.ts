import { Args, Flags } from "@oclif/core";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { resolveNetworkUrl } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";

export class Balance extends SwankyCommand<typeof Balance> {
  static description = "Balance of an account";

  static args = {
    alias: Args.string({
      name: "alias",
      required: true,
      description: "Alias of account to be used",
    }),
  };
  async run(): Promise<void> {
    const { args } = await this.parse(Balance);

    const accountData = this.swankyConfig.accounts.find(
      (account: AccountData) => account.alias === args.alias
    );
    if (!accountData) {
      throw new ConfigError("Provided account alias not found in swanky.config.json");
    }

    const networkUrl = resolveNetworkUrl(this.swankyConfig, "");

    const wsProvider = new WsProvider(networkUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;

    const balance = (await api.query.system.account(accountData.address)).data.free.toBigInt();

    this.log(`Account balance now is: ${balance}`);

    await wsProvider.disconnect();
  }
}
