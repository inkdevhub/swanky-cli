import { AccountData  } from "./account";

export const DEFAULT_NETWORK_URL = "ws://127.0.0.1:9944";

export interface SwankyConfig {
  node: {
    polkadotPalletVersions: string;
    localPath: string;
    supportedInk: string;
  };
  accounts: AccountData[];
  contracts?: { name: string; address: string }[];
  networks: {
    [network: string]: {
      url: string;
    };
  };
}
