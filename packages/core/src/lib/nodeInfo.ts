export type nodeInfo = typeof swankyNode;

export const swankyNode = {
  version: "1.5.0",
  polkadotPalletVersions: "polkadot-v0.9.39",
  supportedInk: "v4.0.0",
  downloadUrl: {
    darwin: {
      "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.5.0/swanky-node-v1.5.0-macOS-universal.tar.gz",
      "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.5.0/swanky-node-v1.5.0-macOS-universal.tar.gz"
    },
    linux: {
      "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.5.0/swanky-node-v1.5.0-ubuntu-aarch64.tar.gz",
      "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.5.0/swanky-node-v1.5.0-ubuntu-x86_64.tar.gz",
    }
  },
};
