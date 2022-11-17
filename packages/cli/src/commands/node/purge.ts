import { Command } from "@oclif/core";
import execa from "execa";
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
export class PurgeNode extends Command {
  static description = "Purge local chain state";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    ensureSwankyProject();

    const config = await getSwankyConfig();
    await execa.command(`${config.node.localPath} purge-chain`, {
      stdio: "inherit",
    });

    this.log("Purged chain state");
  }
}
