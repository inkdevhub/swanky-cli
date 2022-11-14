import { mnemonicGenerate } from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { ChainProperty, KeypairType } from "@astar-network/swanky-core/dist";

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

  constructor(mnemonic: string, type: KeypairType = "sr25519") {
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
