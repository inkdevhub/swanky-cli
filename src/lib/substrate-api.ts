import { ApiPromise } from "@polkadot/api/promise";
import { Keyring, WsProvider } from "@polkadot/api";
import { SignerOptions } from "@polkadot/api/types";
import { Codec, ITuple } from "@polkadot/types-codec/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { TypeRegistry } from "@polkadot/types";
import { DispatchError, BlockHash } from "@polkadot/types/interfaces";
import { ChainAccount } from "./account.js";
import BN from "bn.js";
import { ChainProperty, ExtrinsicPayload, AccountData } from "../types/index.js";

import { KeyringPair } from "@polkadot/keyring/types";
import { Abi, CodePromise } from "@polkadot/api-contract";
import { ApiError, UnknownError } from "./errors.js";
import { ALICE_URI, KEYPAIR_TYPE, LOCAL_FAUCET_AMOUNT } from "./consts.js";
import { BN_TEN } from "@polkadot/util";

export type AbiType = Abi;
// const AUTO_CONNECT_MS = 10_000; // [ms]
const TEN_B = 10_000_000_000;

function CreateApiPromise(provider: WsProvider): Promise<ApiPromise> {
  return new Promise((resolve, reject) => {
    const apiPromise = new ApiPromise({ provider });

    apiPromise.on("error", (error) => {
      reject(new ApiError("Error creating ApiPromise", { cause: error }));
    });

    const disconnectHandler = (cause: Error) => {
      reject(new ApiError("Disconnected from the endpoint", { cause }));
    };

    apiPromise.on("disconnected", disconnectHandler);

    apiPromise.on("ready", () => {
      apiPromise.off("disconnected", disconnectHandler);
      resolve(apiPromise);
    });
  });
}

function CreateProvider(endpoint: string): Promise<WsProvider> {
  return new Promise((resolve, reject) => {
    const provider = new WsProvider(endpoint, false);

    const unsubscribe = provider.on("error", (cause) => {
      unsubscribe();

      const errorSymbol = Object.getOwnPropertySymbols(cause).find(
        (symbol) => symbol.description === "kError"
      );

      const errorObject = errorSymbol
        ? cause[errorSymbol]
        : new UnknownError("Unknown WsProvider error", { cause });

      reject(new ApiError("Cannot connect to the WsProvider", { cause: errorObject }));
    });

    provider.on("connected", () => {
      resolve(provider);
    });
    provider.connect();
  });
}
export class ChainApi {
  private _chainProperty?: ChainProperty;
  private _registry: TypeRegistry;

  protected _provider: WsProvider;
  protected _api: ApiPromise;

  static async create(endpoint: string) {
    const provider = await CreateProvider(endpoint);
    const apiPromise = await CreateApiPromise(provider);
    return new ChainApi(provider, apiPromise);
  }

  constructor(provider: WsProvider, apiPromise: ApiPromise) {
    this._provider = provider;

    this._api = apiPromise;

    this._registry = new TypeRegistry();

    this._chainProperty = undefined;
  }

  public get apiInst(): ApiPromise {
    if (!this._api) {
      throw new ApiError("The ApiPromise has not been initialized");
    }

    return this._api;
  }

  public get chainProperty(): ChainProperty {
    return this._chainProperty!;
  }

  public get typeRegistry(): TypeRegistry {
    return this._registry;
  }

  public async disconnect(): Promise<void> {
    await this._provider.disconnect();
  }

  public async start(): Promise<void> {
    const chainProperties = await this._api.rpc.system.properties();

    const ss58Prefix = Number.parseInt(this._api.consts.system.ss58Prefix.toString() || "0", 10);

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

  public buildTxCall(extrinsic: string, method: string, ...args: any[]): ExtrinsicPayload {
    const ext = this._api?.tx[extrinsic][method](...args);
    if (ext) return ext;
    throw new ApiError(`Undefined extrinsic call ${extrinsic} with method ${method}`);
  }

  public async buildStorageQuery(
    extrinsic: string,
    method: string,
    ...args: any[]
  ): Promise<Codec> {
    const ext = await this._api?.query[extrinsic][method](...args);
    if (ext) return ext;
    throw new ApiError(`Undefined storage query ${extrinsic} for method ${method}`);
  }

  public wrapBatchAll(txs: ExtrinsicPayload[]): ExtrinsicPayload {
    const ext = this._api?.tx.utility.batchAll(txs);
    if (ext) return ext;
    throw new ApiError("Undefined batch all");
  }

  public wrapSudo(tx: ExtrinsicPayload): ExtrinsicPayload {
    const ext = this._api?.tx.sudo.sudo(tx);
    if (ext) return ext;
    throw new ApiError("Undefined sudo");
  }

  public async nonce(account: ChainAccount): Promise<number | undefined> {
    return ((await this._api?.query.system.account(account.pair.address)) as any)?.nonce.toNumber();
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
        .filter((record): boolean => Boolean(record.event) && record.event.section !== "democracy")
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
          } else if (section === "utility" && method === "BatchInterrupted") {
            const anyData = data as any;
            const error = anyData[1].registry.findMetaError(anyData[1].asModule);
            const message = `${error.section}.${error.name}`;
            console.error(`error: ${section}.${method} ${message}`);
          }
        });

      if (handler) handler(result);
    });
  }
  public async deploy(
    abi: Abi,
    wasm: Buffer,
    constructorName: string,
    signerPair: KeyringPair,
    args: string[],
    customGas?: number
  ) {
    const gasLimit = this.apiInst.registry.createType("WeightV2", {
      refTime: BigInt(TEN_B),
      proofSize: BigInt(customGas ?? TEN_B),
    });

    const code = new CodePromise(this._api, abi, wasm);
    const storageDepositLimit = null;
    if (typeof code.tx[constructorName] !== "function") {
      throw new ApiError(`Contract has no constructor called ${constructorName}`);
    }
    const tx = code.tx[constructorName]({ gasLimit, storageDepositLimit }, ...(args || []));
    return new Promise((resolve, reject) => {
      this.signAndSend(signerPair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const instantiateEvent = events.find(({ event }: any) => event.method === "Instantiated");

          const addresses = instantiateEvent?.event.data.toHuman() as {
            contract: string;
            deployer: string;
          };

          if (!addresses?.contract) reject(new Error("Unable to get the contract address"));
          resolve(addresses.contract);
          this._provider.disconnect();
        }
      });
    });
  }

  public async faucet(accountData: AccountData): Promise<void> {
    const keyring = new Keyring({ type: KEYPAIR_TYPE });
    const alicePair = keyring.addFromUri(ALICE_URI);

    const chainDecimals = this._api.registry.chainDecimals[0];
    const amount = new BN(LOCAL_FAUCET_AMOUNT).mul(BN_TEN.pow(new BN(chainDecimals)));

    const tx = this._api.tx.balances.transfer(accountData.address, amount);

    return new Promise((resolve, reject) => {
      this.signAndSend(alicePair, tx, {}, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          const transferEvent = events.find(({ event }) => event?.method === "Transfer");
          if (!transferEvent) {
            reject();
            return;
          }
          resolve();
        }
      }).catch((error) => reject(error));
    });
  }
}
