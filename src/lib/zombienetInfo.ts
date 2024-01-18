export type zombienetInfo = typeof zombienet;

export type BinaryNames = "zombienet" | "polkadot" | "astar-collator";
export const zombienet= {
  version: "1.3.89",
  downloadUrl: {
    darwin: {
      "arm64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-macos",
      "x64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-macos"
    },
    linux: {
      "arm64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-linux-arm64",
      "x64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-linux-x64",
    }
  },
  binaries: {
    "polkadot": {
      version: "0.9.43",
      downloadUrl: {
        darwin: {
          "arm64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot",
          "x64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot"
        },
        linux: {
          "arm64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot",
          "x64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot",
        }
      },
    },
    "astar-collator": {
      version: "5.28.0",
      downloadUrl: {
        darwin: {
          "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-macOS-x86_64.tar.gz",
          "x64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-macOS-x86_64.tar.gz"
        },
        linux: {
          "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-ubuntu-aarch64.tar.gz",
          "x64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-ubuntu-x86_64.tar.gz",
        }
      },
    },
  },
};