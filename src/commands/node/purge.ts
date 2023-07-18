import { execaCommand } from "execa";
import { ensureSwankyProject } from "../../lib/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
export class PurgeNode extends SwankyCommand {
  static description = "Purge local chain state";

  async run(): Promise<void> {
    ensureSwankyProject();

    await execaCommand(`${this.swankyConfig.node.localPath} purge-chain`, {
      stdio: "inherit",
    });

    this.log("Purged chain state");
  }
}
