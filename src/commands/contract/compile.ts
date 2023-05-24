import { Args, Command, Flags } from "@oclif/core";
import path = require("node:path");
import {
  storeArtifacts,
  ensureSwankyProject,
  getSwankyConfig,
  Spinner,
  generateTypes,
} from "../../lib/index.js";
import { spawn } from "node:child_process";
import { pathExists } from "fs-extra/esm";

export class CompileContract extends Command {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    verbose: Flags.boolean({
      default: false,
      char: "v",
      description: "Display additional compilation output",
    }),
    release: Flags.boolean({
      default: false,
      char: "r",
      description:
        "A production contract should always be build in `release` mode for building optimized wasm",
    }),
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to compile all contracts",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompileContract);

    if (args.contractName === undefined && !flags.all) {
      this.error("No contracts were selected to compile");
    }

    await ensureSwankyProject();
    const config = await getSwankyConfig();

    const contractNames = flags.all ? Object.keys(config.contracts) : [args.contractName];
    const spinner = new Spinner();

    for (const contractName of contractNames) {
      const contractInfo = config.contracts[contractName];
      if (!contractInfo) {
        this.error(`Cannot find contract info for ${contractName} contract in swanky.config.json`);
      }
      const contractPath = path.resolve("contracts", contractInfo.name);

      if (!(await pathExists(contractPath))) {
        this.error(`Contract folder not found at expected path`);
      }

      const compilationResult = await spinner.runCommand(
        async () => {
          return new Promise<string>((resolve, reject) => {
            const compileArgs = [
              "contract",
              "build",
              "--manifest-path",
              `${contractPath}/Cargo.toml`,
            ];
            if (flags.release) {
              compileArgs.push("--release");
            }
            const compile = spawn("cargo", compileArgs);
            let outputBuffer = "";

            compile.stdout.on("data", (data) => {
              outputBuffer += data.toString();
              spinner.ora.clear();
            });
            compile.stdout.pipe(process.stdout);

            if (flags.verbose) {
              compile.stderr.on("data", () => spinner.ora.clear());
              compile.stderr.pipe(process.stdout);
            }
            compile.on("exit", (code) => {
              if (code === 0) {
                const regex = /Your contract artifacts are ready\. You can find them in:\n(.*)/;
                const match = outputBuffer.match(regex);
                if (match) resolve(match[1]);
              } else reject();
            });
          });
        },
        `Compiling ${contractName} contract`,
        `${contractName} Contract compiled successfully`
      );

      const artifactsPath = compilationResult as string;

      await spinner.runCommand(async () => {
        return storeArtifacts(artifactsPath, contractInfo.name, contractInfo.moduleName);
      }, "Moving artifacts");

      await spinner.runCommand(
        async () => await generateTypes(contractInfo.name),
        `Generating ${contractName} contract ts types`,
        `${contractName} contract's TS types Generated successfully`
      );
    }
  }
}
