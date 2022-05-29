import { Command, CliUx } from "@oclif/core";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    // const { args, flags } = await this.parse(StartNode);
    let config = { nodePath: "" };
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf-8" });
      config = JSON.parse(file);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    execSync(config.nodePath, {
      stdio: "inherit",
    });
    CliUx.ux.action.stop();
  }
}
