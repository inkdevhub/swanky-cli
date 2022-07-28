import { Command, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import { Listr } from "listr2";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject } from "../../lib/command-utils";
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

    await ensureSwankyProject();

    const tasks = new Listr([
      {
        title: "Compiling contract",
        task: (ctx, task): Promise<void> =>
          new Promise((resolve, reject) => {
            const contractList = readdirSync(path.resolve("contracts"));

            const build = spawn("cargo", ["+nightly", "contract", "build"], {
              cwd: path.resolve("contracts", contractList[0]),
              // stdio: flags.silent ? "ignore" : "inherit",
            });

            build.stdout.pipe(task.stdout());
            if (!flags.silent) {
              build.stderr.pipe(task.stdout());
            }

            build.on("error", (error) => {
              reject(error);
            });

            build.on("exit", () => {
              resolve();
            });
          }),
      },
    ]);

    await tasks.run();
  }
}
