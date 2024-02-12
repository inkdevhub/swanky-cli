import { swankyNodeVersions } from "./nodeInfo.js";

export const DEFAULT_NETWORK_URL = "ws://127.0.0.1:9944";
export const DEFAULT_ASTAR_NETWORK_URL = "wss://rpc.astar.network";
export const DEFAULT_SHIDEN_NETWORK_URL = "wss://rpc.shiden.astar.network";
export const DEFAULT_SHIBUYA_NETWORK_URL = "wss://shibuya.public.blastapi.io";

export const ARTIFACTS_PATH = "artifacts";
export const TYPED_CONTRACTS_PATH = "typedContracts";

export const DEFAULT_NODE_INFO = swankyNodeVersions.get("1.6.0")!;
