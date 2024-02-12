import { Command } from "@oclif/core";
import chalk from "chalk";
import { AccountData, ChainApi, resolveNetworkUrl } from "../../index.js";
import { LOCAL_FAUCET_AMOUNT } from "../../lib/consts.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ApiError } from "../../lib/errors.js";

export abstract class SwankyAccountCommand<T extends typeof Command> extends SwankyCommand<T> {
  async performFaucetTransfer(accountData: AccountData, canBeSkipped = false) {
    let api: ChainApi | null = null;
    try {
      api = (await this.spinner.runCommand(async () => {
        const networkUrl = resolveNetworkUrl(this.swankyConfig, "");
        const api = await ChainApi.create(networkUrl);
        await api.start();
        return api;
      }, "Connecting to node")) as ChainApi;

      if (api)
        await this.spinner.runCommand(
          async () => {
            if (api) await api.faucet(accountData);
          },
          `Transferring ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${accountData.alias}`,
          `Transferred ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${accountData.alias}`,
          `Failed to transfer ${LOCAL_FAUCET_AMOUNT} units from faucet account to ${accountData.alias}`,
          true
        );
    } catch (cause) {
      if (cause instanceof Error) {
        if (cause.message.includes('ECONNREFUSED') && canBeSkipped) {
          this.warn(`Unable to connect to the node. Skipping faucet transfer for ${chalk.yellowBright(accountData.alias)}.`);
        } else {
          throw new ApiError("Error transferring tokens from faucet account", { cause });
        }
      } else {
        throw new ApiError("An unknown error occurred during faucet transfer", { cause: new Error(String(cause)) });
      }
    } finally {
      if (api) {
        await api.disconnect();
      }
    }
  }
}
