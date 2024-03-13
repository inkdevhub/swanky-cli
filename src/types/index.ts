import { SubmittableExtrinsic } from "@polkadot/api/types";
import { SUPPORTED_DEPS } from "../lib/consts.js";

export type KeypairType = "ed25519" | "sr25519" | "ecdsa" | "ethereum";

export interface ChainProperty {
  tokenSymbols: string[];
  tokenDecimals: number[];
  chainName: string;
  ss58Prefix: number;
}

export type ExtrinsicPayload = SubmittableExtrinsic<"promise">;

export interface Encrypted { iv: string; data: string }

export interface AccountData {
  isDev: boolean;
  alias: string;
  mnemonic: string | Encrypted;
  address: string;
}

export interface ContractData {
  name: string;
  moduleName: string;
  build?: BuildData;
  deployments: DeploymentData[];
}

export interface BuildData {
  timestamp: number;
  artifactsPath: string;
  buildMode: BuildMode;
  isVerified: boolean;
}

export interface DeploymentData {
  timestamp: number;
  networkUrl: string;
  deployerAlias: string;
  address: string;
}

export interface DownloadUrl {
  darwin: {
    "arm64": string,
    "x64": string
  },
  linux: {
    "arm64": string,
    "x64": string
  }
}
export interface SwankyConfig extends SwankySystemConfig{
  node: {
    polkadotPalletVersions: string;
    localPath: string;
    supportedInk: string;
    version: string;
    chopsticks?: {
      configPath: string;
    };
  };
  contracts: Record<string, ContractData> | Record<string, never>;
  zombienet?: ZombienetData;
  env: Record<string, string>;
}

export interface SwankySystemConfig {
  defaultAccount: string | null;
  accounts: AccountData[];
  networks: Record<string, {url: string}>;
}

export interface ZombienetData {
  version: string;
  downloadUrl: DownloadUrl;
  binaries: Record<string, { version: string; downloadUrl: Partial<DownloadUrl> }>;
}

export interface ZombienetConfig {
  settings: { timeout: number },
  relaychain: Relaychain,
  parachains: Parachain[],
  hrmp_channels?: HrmpChannel[],
}

export interface Relaychain {
  default_command: string,
  chain: string,
  nodes: Node[]
}
export interface Node {
  name: string,
}
export interface HrmpChannel {
  sender: number,
  recipient: number,
  max_capacity: number,
  max_message_size: number
}
export interface Parachain {
  id: number,
  chain: string,
  cumulus_based: boolean,
  collator: Collator
}
export interface Collator {
  name: string,
  command: string,
  rpc_port: number,
  args: string[],
}

export enum BuildMode {
  Debug = "Debug",
  Release = "Release",
  Verifiable = "Verifiable",
}

export type SupportedPlatforms = "darwin" | "linux";
export type SupportedArch = "arm64" | "x64";

export type DependencyName = keyof typeof SUPPORTED_DEPS;
export type TestType = "e2e" | "mocha";
