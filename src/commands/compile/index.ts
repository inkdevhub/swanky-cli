import { Command, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject } from "../../lib/command-utils";
import { Spinner } from "../../lib/spinner";
export class Compile extends Command {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    verbose: Flags.boolean({
      default: false,
      char: "v",
      description: "Display additional compilation output",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(Compile);

    await ensureSwankyProject();

    const spinner = new Spinner();
    await new Promise<void>((resolve, reject) => {
      spinner.start("Compiling contract");
      const contractList = readdirSync(path.resolve("contracts"));

      const build = spawn("cargo", ["+nightly", "contract", "build"], {
        cwd: path.resolve("contracts", contractList[0]),
      });

      build.stdout.on("data", () => spinner.ora.clear());
      build.stdout.pipe(process.stdout);
      if (flags.verbose) {
        build.stderr.on("data", () => spinner.ora.clear());
        build.stderr.pipe(process.stdout);
      }

      build.on("error", (error) => {
        reject(error);
      });

      build.on("exit", () => {
        resolve();
      });
    });
    spinner.succeed("Contract compiled successfully");
  }
}
