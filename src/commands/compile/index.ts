import { Command, Flags } from "@oclif/core";
import { execSync } from "node:child_process";
import { Listr } from "listr2";
import path = require("node:path");
import { access } from "node:fs/promises";
import { constants, readdirSync } from "node:fs";
export class Compile extends Command {
  static description =
    "Compile the smart contract(s) in your contracts directory";

  static flags = {
    silent: Flags.boolean({
      default: false,
      char: "s",
      description: "Don't display compilation output",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(Compile);
    try {
      await access("swanky.config.json", constants.R_OK);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    const tasks = new Listr([
      {
        title: "Compiling contract",
        task: () => {
          const contractList = readdirSync(path.resolve("contracts"));

          execSync("cargo +nightly contract build", {
            cwd: path.resolve("contracts", contractList[0]),
            stdio: flags.silent ? "ignore" : "inherit",
          });
        },
      },
    ]);

    tasks.run();
  }
}
