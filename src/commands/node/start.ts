import { Command, Flags } from "@oclif/core";
import execa from "execa";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/index.js";
export class StartNode extends Command {
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
      default: 0, // 0 means instant finalitization
      description: "Delay time in seconds after blocks being sealed",
    }),
  };

  async run(): Promise<void> {
    ensureSwankyProject();

    const { flags } = await this.parse(StartNode);

    const config = await getSwankyConfig();
    // Run persistent mode by default. non-persistent mode in case flag is provided.
    // Non-Persistent mode (`--dev`) allows all CORS origin, without `--dev`, users need to specify origins by `--rpc-cors`.
    await execa.command(
      `${config.node.localPath} \
      --finalize-delay-sec ${flags.finalizeDelaySec} \
      ${flags.tmp ? "--dev" : `--rpc-cors ${flags.rpcCors}`}`,
      {
        stdio: "inherit",
      }
    );

    this.log("Node started");
  }
}
