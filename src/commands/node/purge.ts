import { Command } from "@oclif/core";
import execa from "execa";
import { readJSON } from "fs-extra";
import { ensureSwankyProject } from "../../lib/command-utils";
export class PurgeNode extends Command {
  static description = "Purge local chain state";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    ensureSwankyProject();

    const config = await readJSON("swanky.config.json");
    await execa.command(`${config.node.localPath} purge-chain`, {
      stdio: "inherit",
    });

    this.log("Purged chain state");
  }
}
