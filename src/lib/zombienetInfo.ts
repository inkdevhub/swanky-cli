export type zombienetInfo = typeof zombienetBins;

export type BinaryNames = "zombienet" | "polkadot" | "astar-collator";
export const zombienetBins = {
  "zombienet": {
    version: "1.3.89",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/paritytech/zombienet/releases/download/v1.3.89/zombienet-macos",
        "x64": "https://github.com/paritytech/zombienet/releases/download/v1.3.89/zombienet-macos"
      },
      linux: {
        "arm64": "https://github.com/paritytech/zombienet/releases/download/v1.3.89/zombienet-linux-arm64",
        "x64": "https://github.com/paritytech/zombienet/releases/download/v1.3.89/zombienet-linux-x64",
      }
    },
  },
  "polkadot": {
    version: "0.9.43",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/paritytech/polkadot/releases/download/v0.9.43/polkadot",
        "x64": "https://github.com/paritytech/polkadot/releases/download/v0.9.43/polkadot",
      },
      linux: {
        "arm64": "https://github.com/paritytech/polkadot/releases/download/v0.9.43/polkadot",
        "x64": "https://github.com/paritytech/polkadot/releases/download/v0.9.43/polkadot",
      }
    }
  },
  "astar-collator": {
    version: "5.28.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v5.28.0/astar-collator-v5.28.0-macOS-x86_64.tar.gz",
        "x64": "https://github.com/AstarNetwork/Astar/releases/download/v5.28.0/astar-collator-v5.28.0-macOS-x86_64.tar.gz",
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v5.28.0/astar-collator-v5.28.0-ubuntu-aarch64.tar.gz",
        "x64": "https://github.com/AstarNetwork/Astar/releases/download/v5.28.0/astar-collator-v5.28.0-ubuntu-x86_64.tar.gz",
      }
    }
  }
};