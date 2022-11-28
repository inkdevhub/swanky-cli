import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import {
  copyArtifactsFor,
  ensureSwankyProject,
  getBuildCommandFor,
  getSwankyConfig,
  BuildData,
  Spinner,
  generateTypes,
} from "@astar-network/swanky-core";
import { writeJSON } from "fs-extra";
import execa = require("execa");
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

    const contractList = readdirSync(path.resolve("contracts"));

    const contractPath = path.resolve("contracts", args.contractName);
    if (!contractList.includes(args.contractName)) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
    }

    // await execa.command("npx typechain-compiler");
    await spinner.runCommand(
      async () => {
        return new Promise<void>((resolve, reject) => {
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
      },
      "Compiling contract",
      "Contract compiled successfully"
    );

    const buildData = (await spinner.runCommand(async () => {
      return copyArtifactsFor(contractInfo.language, contractInfo.name, contractPath);
    }, "Copying artifacts")) as BuildData;

    // if (contractInfo.language === "ask") {
    //   await spinner.runCommand(async () => {
    //     const testPath = path.resolve(`test/${args.contractName}`);
    //     await generateTypes(buildData.artifactsPath, testPath);
    //   }, "Generating types");
    // }

    await spinner.runCommand(async () => {
      contractInfo.build = buildData;

      await writeJSON(path.resolve("swanky.config.json"), config, {
        spaces: 2,
      });
    }, "Writing config");
  }
}
