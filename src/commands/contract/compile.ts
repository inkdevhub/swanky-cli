import { Command, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject } from "../../lib/command-utils";
import { Spinner } from "../../lib/spinner";
export class CompileContract extends Command {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    contract: Flags.string({ char: "c", required: true }),
    verbose: Flags.boolean({
      default: false,
      char: "v",
      description: "Display additional compilation output",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const spinner = new Spinner();
    await new Promise<void>((resolve, reject) => {
      spinner.start("Compiling contract");
      const contractList = readdirSync(path.resolve("contracts"));

      if (!contractList.includes(flags.contract)) {
        throw Error(`Contract name ${flags.contract} is invalid`)
      }

      const build = spawn("cargo", ["+nightly", "contract", "build"], {
        cwd: path.resolve("contracts", flags.contract),
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
