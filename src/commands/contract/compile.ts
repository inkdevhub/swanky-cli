import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject, getBuildCommandFor, getSwankyConfig } from "../../lib/command-utils";
import { Spinner } from "../../lib/spinner";
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

    const config = await getSwankyConfig();

    const contractInfo = config.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const spinner = new Spinner();
    await new Promise<void>((resolve, reject) => {
      spinner.start("Compiling contract");
      const contractList = readdirSync(path.resolve("contracts"));

      const contractPath = path.resolve("contracts", args.contractName);
      if (!contractList.includes(args.contractName)) {
        this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
      }

      const build = getBuildCommandFor(contractInfo.language, contractPath);

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
    // copy artefacts

    // write config
  }
}
