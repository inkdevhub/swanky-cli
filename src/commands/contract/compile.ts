import { Command, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject, Spinner } from "@astar-network/swanky-core";
export class CompileContract extends Command {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    verbose: Flags.boolean({
      default: false,
      char: "v",
      description: "Display additional compilation output",
    }),
  };

  static args = [
    {
      name: "contractName",
      required: true,
      description: "Name of the contract to compile",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const spinner = new Spinner();
    await new Promise<void>((resolve, reject) => {
      spinner.start("Compiling contract");
      const contractList = readdirSync(path.resolve("contracts"));

      if (!contractList.includes(args.contractName)) {
        throw Error(`Contract name ${args.contractName} is invalid`)
      }

      const build = spawn("cargo", ["+nightly", "contract", "build"], {
        cwd: path.resolve("contracts", args.contractName),
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
