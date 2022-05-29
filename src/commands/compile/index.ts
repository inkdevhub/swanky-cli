import { Command, CliUx } from "@oclif/core";
import { execSync } from "node:child_process";
import path = require("node:path");
import { access } from "node:fs/promises";
import { constants, readdirSync } from "node:fs";
export class Compile extends Command {
  static description =
    "Compile the smart contract(s) in your contracts directory";

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    // const { args, flags } = await this.parse(Compile);
    try {
      await access("swanky.config.json", constants.R_OK);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    const contractList = readdirSync(path.resolve("contracts"));

    CliUx.ux.action.start("Compiling..");
    execSync("cargo +nightly contract build", {
      cwd: path.resolve("contracts", contractList[0]),
      stdio: "ignore",
    });
    CliUx.ux.action.stop();
  }
}
