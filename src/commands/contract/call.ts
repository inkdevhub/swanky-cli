import { Command, Flags } from "@oclif/core";
import { execSync } from "node:child_process";
import path = require("node:path");
import { getSwankyConfig, resolveNetworkUrl } from "../../lib/command-utils";

export class CallContract extends Command {
  static description = "Call a method on a smart contract";

  static flags = {
    args: Flags.string({
      required: false,
      char: "a",
    }),
    contractName: Flags.string({
      required: true,
    }),
    message: Flags.string({
      required: true,
      char: "m",
    }),
    dry: Flags.boolean({
      char: "d",
    }),
    gas: Flags.string({
      char: "g",
    }),
    network: Flags.string({
      char: "n",
      description: "Network name to connect to",
    }),
    deploymentTimestamp: Flags.integer({
      char: "t",
      required: false,
      description: "Specific deployment to target",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(CallContract);
    const config = await getSwankyConfig();

    const contractInfo = config.contracts[flags.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${flags.contractName} in swanky.config.json`);
    }

    const deploymentAddress = flags.deploymentTimestamp
      ? contractInfo.deployments.find(
          (deployment) => deployment.timestamp === flags.deploymentTimestamp
        )
      : contractInfo.deployments[0];

    execSync(
      `cargo contract call --contract ${deploymentAddress} --message ${flags.message} ${
        flags.args ? "--args " + flags.args : ""
      } --suri //Alice --gas ${flags.gas ?? "100000000000"} --url ${resolveNetworkUrl(
        config,
        flags.network ?? ""
      )} ${flags.dry ? "--dry-run" : ""}`,
      {
        stdio: "inherit",
        cwd: path.resolve("contracts", contractInfo?.name ?? ""),
      }
    );
  }
}
