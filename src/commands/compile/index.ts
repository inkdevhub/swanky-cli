import { Command } from "@oclif/core";
import { execSync } from "node:child_process";
import path = require("node:path");

export class Compile extends Command {
  static description =
    "Compile the smart contract(s) in your contracts directory";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    // const { args } = await this.parse(Compile);
    execSync("cargo +nightly contract build", {
      cwd: path.resolve("contracts", "flipper"),
      stdio: "inherit",
    });
  }
}
