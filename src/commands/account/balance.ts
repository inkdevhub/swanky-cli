import { Args } from "@oclif/core";
import { ApiPromise } from "@polkadot/api";
import { ChainApi, resolveNetworkUrl } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";
import { formatBalance } from "@polkadot/util";

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

    const api = (await this.spinner.runCommand(async () => {
      const api = await ChainApi.create(networkUrl);
      await api.start();
      return api.apiInst;
    }, "Connecting to node")) as ApiPromise;

    const {nonce, data: balance} = (await api.query.system.account(accountData.address));
    const decimals = api.registry.chainDecimals[0];
    console.log('Raw balance:', balance.free.toBigInt())
    formatBalance.setDefaults({ unit: 'UNIT', decimals });
    const defaults = formatBalance.getDefaults();
    const free = formatBalance(balance.free, { withSiFull: true });
    const reserved = formatBalance(balance.reserved, { withSiFull: true });
    console.log('Formatted balance:', `{"free": "${free}", "unit": "${defaults.unit}", "reserved": "${reserved}", "nonce": "${nonce.toHuman()}"}`);
    await api.disconnect();
  }
}
