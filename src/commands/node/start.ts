import { Command } from "@oclif/core";
import execa from "execa";
import { readJSON } from "fs-extra";
import { ensureSwankyProject } from "../../lib/command-utils";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    ensureSwankyProject();

    const config = await readJSON("swanky.config.json");
    await execa.command(`${config.node.localPath} --dev`, {
      stdio: "inherit",
    });

    this.log("Node started");
  }
}
