import { Command } from "@oclif/core";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf8" });
      const config = JSON.parse(file);

      execSync(`${config.node.localPath} --dev`, {
        stdio: "inherit",
      });
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    this.log("Node started");
  }
}
