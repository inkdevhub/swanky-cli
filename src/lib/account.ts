import { mnemonicGenerate } from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { AccountData, ChainProperty, KeypairType } from "../types/index.js";
import { KEYPAIR_TYPE, LOCAL_FAUCET_AMOUNT } from "./consts.js";
import { Command } from "@oclif/core";
import { SwankyCommand } from "./swankyCommand.js";
import { ChainApi } from "./substrate-api.js";
import { resolveNetworkUrl } from "./command-utils.js";
import chalk from "chalk";
import { ApiError } from "./errors.js";

interface IChainAccount {
  pair: KeyringPair;
  keyring: Keyring;
}

export class ChainAccount implements IChainAccount {
  private _keyring: Keyring;
  private _mnemonic: string;
  private _keyringType: KeypairType;

  public static generate() {
    return mnemonicGenerate();
  }

  constructor(mnemonic: string, type: KeypairType = KEYPAIR_TYPE) {
    this._keyringType = type;
    this._keyring = new Keyring({ type: type });
    this._mnemonic = mnemonic;
  }

  public get pair(): KeyringPair {
    return this._keyring.addFromUri(this._mnemonic, { name: "Default" }, this._keyringType);
  }

  public get keyring(): Keyring {
    return this._keyring;
  }

  public formatAccount(chainProperty: ChainProperty): void {
    this._keyring.setSS58Format(chainProperty.ss58Prefix);
  }
}

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

