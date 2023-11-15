import { Args, Flags } from "@oclif/core";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { resolveNetworkUrl } from "../../lib/index.js";
import { AccountData } from "../../types/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError } from "../../lib/errors.js";

export class Faucet extends SwankyCommand<typeof Faucet> {
  static description = "Faucet some tokens to an account";

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

    const wsProvider = new WsProvider(networkUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;

    const keyring = new Keyring({ type: 'sr25519' });

    const alicePair = keyring.addFromUri('//Alice');

    await this.spinner.runCommand(async () => {
      await api.tx.balances
        .transfer(accountData.address, BigInt(100000000000000000000n))
        .signAndSend(alicePair);

      await wsProvider.disconnect();
    }, `Fauceting 100000000000000000000 units to ${args.alias}`);

  }
}
