export interface nodeInfo {
  version: string;
  polkadotPalletVersions: string;
  supportedInk: string;
  downloadUrl: {
    darwin: {
      "arm64"?: string;
      "x64"?: string;
    };
    linux: {
      "arm64"?: string;
      "x64"?: string;
    };
  };
}

export const swankyNodeVersions = new Map<string, nodeInfo>([
  ["1.6.0", {
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
  }],
  ["1.5.0", {
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
    }
  }],
  ["1.4.0", {
    version: "1.4.0",
    polkadotPalletVersions: "polkadot-v0.9.37",
    supportedInk: "v4.0.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.4.0/swanky-node-v1.4.0-macOS-universal.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.4.0/swanky-node-v1.4.0-macOS-universal.tar.gz"
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.4.0/swanky-node-v1.4.0-ubuntu-aarch64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.4.0/swanky-node-v1.4.0-ubuntu-x86_64.tar.gz",
      }
    }
  }],
  ["1.3.0", {
    version: "1.3.0",
    polkadotPalletVersions: "polkadot-v0.9.37",
    supportedInk: "v4.0.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.3.0/swanky-node-v1.3.0-macOS-universal.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.3.0/swanky-node-v1.3.0-macOS-universal.tar.gz"
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.3.0/swanky-node-v1.3.0-ubuntu-aarch64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.3.0/swanky-node-v1.3.0-ubuntu-x86_64.tar.gz",
      }
    }
  }],
  ["1.2.0", {
    version: "1.2.0",
    polkadotPalletVersions: "polkadot-v0.9.37",
    supportedInk: "v4.0.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.2.0/swanky-node-v1.2.0-macOS-universal.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.2.0/swanky-node-v1.2.0-macOS-universal.tar.gz"
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.2.0/swanky-node-v1.2.0-ubuntu-aarch64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.2.0/swanky-node-v1.2.0-ubuntu-x86_64.tar.gz",
      }
    }
  }],
  ["1.1.0", {
    version: "1.1.0",
    polkadotPalletVersions: "polkadot-v0.9.37",
    supportedInk: "v4.0.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.1.0/swanky-node-v1.1.0-macOS-x86_64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.1.0/swanky-node-v1.1.0-macOS-x86_64.tar.gz"
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.1.0/swanky-node-v1.1.0-ubuntu-x86_64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.1.0/swanky-node-v1.1.0-ubuntu-x86_64.tar.gz",
      }
    }
  }],
  ["1.0.0", {
    version: "1.0.0",
    polkadotPalletVersions: "polkadot-v0.9.30",
    supportedInk: "v3.4.0",
    downloadUrl: {
      darwin: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.0.0/swanky-node-v1.0.0-macOS-x86_64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.0.0/swanky-node-v1.0.0-macOS-x86_64.tar.gz"
      },
      linux: {
        "arm64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.0.0/swanky-node-v1.0.0-ubuntu-x86_64.tar.gz",
        "x64": "https://github.com/AstarNetwork/swanky-node/releases/download/v1.0.0/swanky-node-v1.0.0-ubuntu-x86_64.tar.gz",
      }
    }
  }]
]);
