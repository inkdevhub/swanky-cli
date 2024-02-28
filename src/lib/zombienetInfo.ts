export type zombienetInfo = typeof zombienet;

export type BinaryNames = "zombienet" | "polkadot" | "polkadot-parachain" | "astar-collator";

export const zombienet = {
  version: "1.3.89",
  downloadUrl: {
    darwin: {
      "arm64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-macos",
      "x64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-macos",
    },
    linux: {
      "arm64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-linux-arm64",
      "x64": "https://github.com/paritytech/zombienet/releases/download/v${version}/zombienet-linux-x64",
    },
  },
  binaries: {
    "polkadot": {
      version: "0.9.43",
      downloadUrl: {
        linux: {
          "arm64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot",
          "x64": "https://github.com/paritytech/polkadot/releases/download/v${version}/polkadot",
        },
      },
    },
    "polkadot-parachain": {
      version: "0.9.430",
      downloadUrl: {
        linux: {
          "arm64": "https://github.com/paritytech/cumulus/releases/download/v${version}/polkadot-parachain",
          "x64": "https://github.com/paritytech/cumulus/releases/download/v${version}/polkadot-parachain",
        },
      },
    },
    "astar-collator": {
      version: "5.28.0",
      downloadUrl: {
        darwin: {
          "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-macOS-x86_64.tar.gz",
          "x64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-macOS-x86_64.tar.gz",
        },
        linux: {
          "arm64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-ubuntu-aarch64.tar.gz",
          "x64": "https://github.com/AstarNetwork/Astar/releases/download/v${version}/astar-collator-v${version}-ubuntu-x86_64.tar.gz",
        },
      },
    },
  },
};

export const zombienetBinariesList = Object.keys(zombienet.binaries);
