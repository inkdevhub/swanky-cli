import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import {
  moveArtifactsFor,
  ensureSwankyProject,
  getBuildCommandFor,
  getSwankyConfig,
  BuildData,
  Spinner,
} from "@astar-network/swanky-core";
import { readJSON, writeJSON } from "fs-extra";
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

    // Dirty fix: modify typechain-compiler's config.json before compiling.
    // Due to typechain-compiler's limitation (https://github.com/Supercolony-net/typechain-polkadot#usage-of-typechain-compiler),
    // it is currently unable to choose which contracts to compile without modifying global config.json file.
    // This temporal fixes needed until having upstream fixes or finding alternative solution.
    const typechainCompilerConfig: TypechainCompilerConfig = await readJSON("config.json");
    typechainCompilerConfig.projectFiles = [`contracts/${args.contractName}/*`];
    await writeJSON(path.resolve("config.json"), typechainCompilerConfig, {
      spaces: 2,
    })

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
      return moveArtifactsFor(contractInfo.language, contractInfo.name, contractPath);
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

// https://github.com/Supercolony-net/typechain-polkadot#usage-of-typechain-compiler
export interface TypechainCompilerConfig {
  projectFiles: string[]; // Path to all project files, everystring in glob format
  skipLinting : boolean; // Skip linting of project files
  artifactsPath : string; // Path to artifacts folder, where artifacts will be stored it will save both .contract and .json (contract ABI)
  typechainGeneratedPath : string; // Path to typechain generated folder
}
