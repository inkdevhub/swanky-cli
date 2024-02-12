import { Args, Flags } from "@oclif/core";
import path from "node:path";
import { ensureCargoContractVersionCompatibility, extractCargoContractVersion, generateTypes, Spinner, storeArtifacts } from "../../lib/index.js";
import { spawn } from "node:child_process";
import { pathExists } from "fs-extra/esm";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, InputError, ProcessError } from "../../lib/errors.js";

export class CompileContract extends SwankyCommand<typeof CompileContract> {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    release: Flags.boolean({
      default: false,
      char: "r",
      description:
        "A production contract should always be build in `release` mode for building optimized wasm",
    }),
    verifiable: Flags.boolean({
      default: false,
      description:
        "A production contract should be build in `verifiable` mode to deploy on a public network. Ensure Docker Engine is up and running.",
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
      throw new InputError("No contracts were selected to compile", { winston: { stack: true } });
    }

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];
    const spinner = new Spinner();

    for (const contractName of contractNames) {
      this.logger.info(`Started compiling contract [${contractName}]`);
      const contractInfo = this.swankyConfig.contracts[contractName];
      if (!contractInfo) {
        throw new ConfigError(
          `Cannot find contract info for ${contractName} contract in swanky.config.json`,
        );
      }
      const contractPath = path.resolve("contracts", contractInfo.name);
      this.logger.info(`"Looking for contract ${contractInfo.name} in path: [${contractPath}]`);
      if (!(await pathExists(contractPath))) {
        throw new InputError(`Contract folder not found at expected path`);
      }

      const compilationResult = await spinner.runCommand(
        async () => {
          return new Promise<string>((resolve, reject) => {
            const compileArgs = [
              "contract",
              "build",
              "--manifest-path",
              `contracts/${contractName}/Cargo.toml`,
            ];
            if (flags.release && !flags.verifiable) {
              compileArgs.push("--release");
            }
            if (flags.verifiable) {
              const cargoContractVersion = extractCargoContractVersion();
              if (cargoContractVersion === null)
                throw new InputError(
                  `Cargo contract tool is required for verifiable mode. Please ensure it is installed.`
                );

              ensureCargoContractVersionCompatibility(cargoContractVersion, "4.0.0", [
                "4.0.0-alpha",
              ]);
              compileArgs.push("--verifiable");
            }
            const compile = spawn("cargo", compileArgs);
            this.logger.info(`Running compile command: [${JSON.stringify(compile.spawnargs)}]`);
            let outputBuffer = "";
            let errorBuffer = "";

            compile.stdout.on("data", (data) => {
              outputBuffer += data.toString();
              spinner.ora.clear();
            });
            compile.stdout.pipe(process.stdout);

            compile.stderr.on("data", (data) => {
              errorBuffer += data;
            });

            compile.on("exit", (code) => {
              if (code === 0) {
                const regex = /Your contract artifacts are ready\. You can find them in:\n(.*)/;
                const match = outputBuffer.match(regex);
                if (match) {
                  this.logger.info(`Contract ${contractName} compilation done.`);
                  resolve(match[1]);
                }
              } else {
                reject(new ProcessError(errorBuffer));
              }
            });
          });
        },
        `Compiling ${contractName} contract`,
        `${contractName} Contract compiled successfully`,
      );

      const artifactsPath = compilationResult as string;

      await spinner.runCommand(async () => {
        return storeArtifacts(artifactsPath, contractInfo.name, contractInfo.moduleName);
      }, "Moving artifacts");

      await spinner.runCommand(
        async () => await generateTypes(contractInfo.name),
        `Generating ${contractName} contract ts types`,
        `${contractName} contract's TS types Generated successfully`,
      );

      this.swankyConfig.contracts[contractName].build = {
        timestamp: Date.now(),
        artifactsPath,
        isVerified: false,
      };

      await this.storeConfig();
    }
  }
}
