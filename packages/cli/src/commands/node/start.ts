import { Command, Flags } from "@oclif/core";
import execa from "execa";
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {
    tmp: Flags.boolean({
      char: "t",
      description: "Run node with non-persistent mode",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    ensureSwankyProject();

    const { flags } = await this.parse(StartNode);

    const config = await getSwankyConfig();
    const rpcCors = "http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,https://contracts-ui.substrate.io/";
    // run persistent mode by default. non-persistent mode in case flag is provided.
    await execa.command(`${config.node.localPath} \
      ${flags.tmp ? "--dev" : `--rpc-cors ${rpcCors}`}`, {
      stdio: "inherit",
    });

    this.log("Node started");
  }
}
