export const DEFAULT_NETWORK_URL = "ws://127.0.0.1:9944";
export const DEFAULT_ASTAR_NETWORK_URL = "wss://rpc.astar.network";
export const DEFAULT_SHIDEN_NETWORK_URL = "wss://rpc.shiden.astar.network";
export const DEFAULT_SHIBUYA_NETWORK_URL = "wss://shibuya.public.blastapi.io";

export const ARTIFACTS_PATH = "artifacts";
export const TYPED_CONTRACTS_PATH = "typedContracts";

export const DEFAULT_NODE_INFO = {
  version: "1.6.0",
  polkadotPalletVersions: "polkadot-v0.9.39",
  supportedInk: "v4.2.0",
  downloadUrl: {
    darwin: {
      "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.6.0/swanky-node-v1.6.0-macOS-universal.tar.gz",
      "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.6.0/swanky-node-v1.6.0-macOS-universal.tar.gz"
    },
    linux: {
      "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.6.0/swanky-node-v1.6.0-ubuntu-aarch64.tar.gz",
      "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.6.0/swanky-node-v1.6.0-ubuntu-x86_64.tar.gz",
    }
  }
}
