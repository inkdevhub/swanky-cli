import { Command } from "@oclif/core";
import { execaCommand } from "execa";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/index.js";
export class PurgeNode extends Command {
  static description = "Purge local chain state";

  async run(): Promise<void> {
    ensureSwankyProject();

    const config = await getSwankyConfig();
    await execaCommand(`${config.node.localPath} purge-chain`, {
      stdio: "inherit",
    });

    this.log("Purged chain state");
  }
}
