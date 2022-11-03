import { Command, Flags } from "@oclif/core";
import { execSync } from "node:child_process";
import path = require("node:path");
import { getSwankyConfig, resolveNetworkUrl } from "@astar-network/swanky-core";

export class CallContract extends Command {
  static description = "Call a method on a smart contract";

  static flags = {
    args: Flags.string({
      required: false,
      char: "a",
    }),
    address: Flags.string({
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
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(CallContract);

    const config = await getSwankyConfig();

    const contractInfo = config.contracts?.find(item => item.address == flags.address);
    if (!contractInfo) {
      throw Error("contract address not found in swanky config")
    }
    execSync(
      `cargo contract call --contract ${
        contractInfo?.address
      } --message ${flags.message} ${flags.args ? "--args " + flags.args : ""} --suri //Alice --gas ${
        flags.gas ?? "100000000000"
      } --url ${resolveNetworkUrl(config, flags.network ?? "")} ${
        flags.dry ? "--dry-run" : ""
      }`,
      {
        stdio: "inherit",
        cwd: path.resolve(
          "contracts",
          contractInfo?.name ?? ""
        ),
      }
    );
  }
}
