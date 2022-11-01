import { SwankyConfig } from "./config";

export const DEFAULT_LOCAL_NETWORK_URL = "ws://127.0.0.1:9944";
export const DEFAULT_ASTAR_NETWORK_URL = "wss://rpc.astar.network";
export const DEFAULT_SHIDEN_NETWORK_URL = "wss://rpc.shiden.astar.network";
export const DEFAULT_SHIBUYA_NETWORK_URL = "wss://rpc.shibuya.astar.network";

export function resolveNetworkUrl(
  config: SwankyConfig,
  networkName: string
): string {
  if (networkName === "") {
    return DEFAULT_LOCAL_NETWORK_URL;
  }

  try {
    return config.networks[networkName].url;
  } catch {
    throw new Error("Network name not found in SwankyConfig");
  }
}