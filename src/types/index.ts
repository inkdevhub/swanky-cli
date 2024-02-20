import { SubmittableExtrinsic } from "@polkadot/api/types";

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
  deployments: DeploymentData[] | [];
}

export interface BuildData {
  timestamp: number;
  artifactsPath: string;
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
export interface SwankyConfig {
  node: {
    polkadotPalletVersions: string;
    localPath: string;
    supportedInk: string;
  };
  accounts: AccountData[];
  contracts: Record<string, ContractData> | Record<string, never>;
  networks: Record<string, {url: string}>
  zombienet?: ZombienetData;
}

interface ZombienetData {
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

export type SupportedPlatforms = "darwin" | "linux";
export type SupportedArch = "arm64" | "x64";
