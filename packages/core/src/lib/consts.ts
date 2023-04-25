export const DEFAULT_NETWORK_URL = "ws://127.0.0.1:9944";
export const DEFAULT_ASTAR_NETWORK_URL = "wss://rpc.astar.network";
export const DEFAULT_SHIDEN_NETWORK_URL = "wss://rpc.shiden.astar.network";
export const DEFAULT_SHIBUYA_NETWORK_URL = "wss://rpc.shibuya.astar.network";

export const STORED_ARTIFACTS_PATH = "./artifacts";

// typechain-polkadot's output files are tightly coupled with input folder path.
// ./artifacts folder is used not only for storing historical artifacts, but also as typechain-polkadot's input folder.
// So, name duplication with `STORED_ARTIFACTS_PATH` is expected at least for now.
export const TEMP_ARTIFACTS_PATH = "./artifacts";
export const TEMP_TYPED_CONTRACT_PATH = "./typedContract";