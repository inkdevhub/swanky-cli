import { Command } from "@oclif/core";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { SwankyConfig } from "../init";
export class StartNode extends Command {
  static description = "Start a local node";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    let config: SwankyConfig = {
      platform: "",
      project_name: "",
      node: {},
      accounts: [],
      author: { name: "", email: "" },
    };
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf8" });
      config = JSON.parse(file);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    execSync(`${config.node.localPath} --dev`, {
      stdio: "inherit",
    });

    this.log("Node started");
  }
}
