import { ApiPromise, WsProvider } from "@polkadot/api";
import { SignerOptions } from "@polkadot/api/types";
import { Codec, ISubmittableResult, ITuple } from "@polkadot/types/types";
import { TypeRegistry } from "@polkadot/types";
import { DispatchError, BlockHash } from "@polkadot/types/interfaces";
import { ChainAccount } from "./account";
import BN from "bn.js";
import { ExtrinsicPayload, ChainProperty } from "../types";
import { KeyringPair } from "@polkadot/keyring/types";
const AUTO_CONNECT_MS = 10_000; // [ms]

export class ChainApi {
  private _chainProperty?: ChainProperty;
  private _registry: TypeRegistry;

  protected _provider: WsProvider;
  protected _api: ApiPromise;

  constructor(endpoint: string, silent = true) {
    this._provider = new WsProvider(endpoint, AUTO_CONNECT_MS);

    if (!silent) console.log("connecting to " + endpoint);

    this._api = new ApiPromise({
      provider: this._provider,
    });

    this._registry = new TypeRegistry();

    this._chainProperty = undefined;
  }

  public get apiInst(): ApiPromise {
    if (!this._api) {
      throw new Error("The ApiPromise has not been initialized");
    }

    return this._api;
  }

  public get chainProperty(): ChainProperty {
    return this._chainProperty as ChainProperty;
  }

  public get typeRegistry(): TypeRegistry {
    return this._registry;
  }

  public async start(): Promise<void> {
    this._api = await this._api.isReady;

    const chainProperties = await this._api.rpc.system.properties();

    const ss58Prefix = Number.parseInt(
      (await this._api.consts.system.ss58Prefix).toString() || "0",
      10
    );

    const tokenDecimals = chainProperties.tokenDecimals
      .unwrapOrDefault()
      .toArray()
      .map((i) => i.toNumber());

    const tokenSymbols = chainProperties.tokenSymbol
      .unwrapOrDefault()
      .toArray()
      .map((i) => i.toString());

    const chainName = (await this._api.rpc.system.chain()).toString();

    this._chainProperty = {
      tokenSymbols,
      tokenDecimals,
      chainName,
      ss58Prefix,
    };
  }

  public async getBlockHash(blockNumber: number): Promise<BlockHash> {
    return this._api?.rpc.chain.getBlockHash(blockNumber);
  }

  public buildTxCall(
    extrinsic: string,
    method: string,
    ...args: any[]
  ): ExtrinsicPayload {
    const ext = this._api?.tx[extrinsic][method](...args);
    if (ext) return ext;
    throw new Error(
      `Undefined extrinsic call ${extrinsic} with method ${method}`
    );
  }

  public buildStorageQuery(
    extrinsic: string,
    method: string,
    ...args: any[]
  ): Promise<Codec> {
    const ext = this._api?.query[extrinsic][method](...args);
    if (ext) return ext;
    throw new Error(
      `Undefined storage query ${extrinsic} for method ${method}`
    );
  }

  public wrapBatchAll(txs: ExtrinsicPayload[]): ExtrinsicPayload {
    const ext = this._api?.tx.utility.batchAll(txs);
    if (ext) return ext;
    throw new Error("Undefined batch all");
  }

  public wrapSudo(tx: ExtrinsicPayload): ExtrinsicPayload {
    const ext = this._api?.tx.sudo.sudo(tx);
    if (ext) return ext;
    throw new Error("Undefined sudo");
  }

  public async nonce(account: ChainAccount): Promise<number | undefined> {
    return (
      (await this._api?.query.system.account(account.pair.address)) as any
    )?.nonce.toNumber();
  }

  public async getBalance(account: ChainAccount): Promise<BN> {
    return (
      (await this._api?.query.system.account(account.pair.address)) as any
    ).data.free.toBn() as BN;
  }

  public async signAndSend(
    signer: KeyringPair,
    tx: ExtrinsicPayload,
    options?: Partial<SignerOptions>,
    handler?: (result: ISubmittableResult) => void
  ): Promise<() => void> {
    // ensure that we automatically increment the nonce per transaction
    return tx.signAndSend(signer, { nonce: -1, ...options }, (result) => {
      // handle transaction errors
      result.events
        .filter(
          (record): boolean =>
            Boolean(record.event) && record.event.section !== "democracy"
        )
        .forEach(({ event: { data, method, section } }) => {
          if (section === "system" && method === "ExtrinsicFailed") {
            const [dispatchError] = data as unknown as ITuple<[DispatchError]>;
            let message = dispatchError.type.toString();

            if (dispatchError.isModule) {
              try {
                const mod = dispatchError.asModule;
                const error = dispatchError.registry.findMetaError(mod);

                message = `${error.section}.${error.name}`;
              } catch (error) {
                console.error(error);
              }
            } else if (dispatchError.isToken) {
              message = `${dispatchError.type}.${dispatchError.asToken.type}`;
            }

            const errorMessage = `${section}.${method} ${message}`;
            console.error(`error: ${errorMessage}`);

            throw new Error(message);
          } else if (section === "utility" && method === "BatchInterrupted") {
            const anyData = data as any;
            const error = anyData[1].registry.findMetaError(
              anyData[1].asModule
            );
            const message = `${error.section}.${error.name}`;
            console.error(`error: ${section}.${method} ${message}`);
          }
        });

      if (handler) handler(result);
    });
  }
}
