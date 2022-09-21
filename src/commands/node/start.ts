import { Command, Flags } from "@oclif/core";
import execa from "execa";
import { readJSON } from "fs-extra";
import { ensureSwankyProject } from "../../lib/command-utils";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {
    tmp: Flags.boolean({
      char: "t",
      description: "Run node with non-persistent mode"
    }),
  };

  static args = [];

  async run(): Promise<void> {
    ensureSwankyProject();

    const { flags } = await this.parse(StartNode);

    const config = await readJSON("swanky.config.json");
    // run persistent mode by default. non-persistent mode in case flag is provided.
    await execa.command(`${config.node.localPath} ${flags.tmp ? "--dev" : ""}`, {
      stdio: "inherit",
    });

    this.log("Node started");
  }
}
