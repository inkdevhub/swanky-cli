import { Flags } from "@oclif/core";
import { execaCommand } from "execa";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import semver from "semver";
export class StartNode extends SwankyCommand<typeof StartNode> {
  static description = "Start a local node";

  static flags = {
    tmp: Flags.boolean({
      char: "t",
      required: false,
      description: "Run node with non-persistent mode",
    }),
    rpcCors: Flags.string({
      required: false,
      default:
        "http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,https://contracts-ui.substrate.io/",
      description: `RPC CORS origin swanky-node accepts. With '--tmp' flag, node accepts all origins.
        Without it, you may need to specify by comma separated string.
        By default, 'http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,https://contracts-ui.substrate.io/' is set.`,
    }),
    finalizeDelaySec: Flags.integer({
      required: false,
      default: 0, // 0 means instant finalization
      description: "Delay time in seconds after blocks being sealed",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StartNode);

    if (this.swankyConfig.node.version === "") {
      this.log("Node is not installed");
      return;
    }
    // Run persistent mode by default. non-persistent mode in case flag is provided.
    // Non-Persistent mode (`--dev`) allows all CORS origin, without `--dev`, users need to specify origins by `--rpc-cors`.
    await execaCommand(
      `${this.swankyConfig.node.localPath} \
      ${ semver.gte(this.swankyConfig.node.version, "1.6.0") ? `--finalize-delay-sec ${flags.finalizeDelaySec}` : ""} \
      ${flags.tmp ? "--dev" : `--rpc-cors ${flags.rpcCors}`}`,
      {
        stdio: "inherit",
      }
    );

    this.log("Node started");
  }
}
