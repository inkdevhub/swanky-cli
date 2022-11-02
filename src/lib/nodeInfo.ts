export interface NodeInfo {
  name: string,
  version: string,
  polkadotPalletVersions: string,
  supportedInk: string,
  downloadUrl: {
    [platform: string]: string,
  }
}
