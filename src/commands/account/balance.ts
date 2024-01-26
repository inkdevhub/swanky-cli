import { Args } from "@oclif/core";
import { ApiPromise } from "@polkadot/api";
import type { AccountInfo, Balance as BalanceType } from "@polkadot/types/interfaces";
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

    const decimals = api.registry.chainDecimals[0];
    formatBalance.setDefaults({ unit: "UNIT", decimals });

    const { nonce, data: balance } = await api.query.system.account<AccountInfo>(
      accountData.address
    );
    const { free, reserved, miscFrozen, feeFrozen } = balance;

    let frozen: BalanceType;
    if (feeFrozen.gt(miscFrozen)) {
      frozen = feeFrozen;
    } else {
      frozen = miscFrozen;
    }

    const transferrableBalance = free.sub(frozen);
    const totalBalance = free.add(reserved);

    console.log("Transferrable Balance:", formatBalance(transferrableBalance));
    if (!transferrableBalance.eq(totalBalance)) {
      console.log("Total Balance:", formatBalance(totalBalance));
      console.log("Raw Balances:", balance.toHuman());
    }
    console.log("Account Nonce:", nonce.toHuman());

    await api.disconnect();
  }
}
