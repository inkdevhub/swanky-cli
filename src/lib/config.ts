import fs = require("fs-extra");
import { AccountData } from "./account";

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

export async function ensureSwankyProject(): Promise<void> {
  const configExists = await fs.pathExists("swanky.config.json");
  if (!configExists) {
    throw new Error("No 'swanky.config.json' detected in current folder!");
  }
}

export async function getSwankyConfig(): Promise<SwankyConfig> {
  try {
    const config = await fs.readJSON("swanky.config.json");
    return config;
  } catch {
    throw new Error("No 'swanky.config.json' detected in current folder!");
  }
}
