import { Args, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import {
  extractCargoContractVersion,
  Spinner,
  storeArtifacts,
  getSwankyConfig,
  findContractRecord,
} from "../../lib/index.js";
import { InputError, ProcessError } from "../../lib/errors.js";
import { BuildMode, SwankyConfig } from "../../index.js";
import { ConfigBuilder } from "../../lib/config-builder.js";
import { ensureContractNameOrAllFlagIsSet, ensureContractPathExists, ensureCargoContractVersionCompatibility, } from "../../lib/checks.js";

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

    const localConfig = getSwankyConfig("local") as SwankyConfig;

    ensureContractNameOrAllFlagIsSet(args, flags);

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];
    const spinner = new Spinner();

    for (const contractName of contractNames) {
      this.logger.info(`Started compiling contract [${contractName}]`);

      const contractRecord = findContractRecord(this.swankyConfig, contractName);

      await ensureContractPathExists(contractName);

      let buildMode = BuildMode.Debug;
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
              buildMode = BuildMode.Release;
              compileArgs.push("--release");
            }
            if (flags.verifiable) {
              buildMode = BuildMode.Verifiable;
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
        return storeArtifacts(artifactsPath, contractRecord.name, contractRecord.moduleName);
      }, "Moving artifacts");

      await this.spinner.runCommand(async () => {
        const buildData = {
          timestamp: Date.now(),
          artifactsPath,
          buildMode,
          isVerified: false,
        };
        const newLocalConfig = new ConfigBuilder(localConfig)
          .addContractBuild(args.contractName, buildData)
          .build();
        await this.storeConfig(newLocalConfig, "local");
      }, "Writing config");
    }
  }
}
