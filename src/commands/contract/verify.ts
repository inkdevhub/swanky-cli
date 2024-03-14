import { Args, Flags } from "@oclif/core";
import {
  extractCargoContractVersion,
  findContractRecord,
  getSwankyConfig,
  Spinner,
} from "../../lib/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { InputError, ProcessError } from "../../lib/errors.js";
import { spawn } from "node:child_process";
import { ConfigBuilder } from "../../lib/config-builder.js";
import { BuildData, SwankyConfig } from "../../index.js";
import { ensureContractNameOrAllFlagIsSet, ensureContractPathExists, ensureCargoContractVersionCompatibility } from "../../lib/checks.js";

export class VerifyContract extends SwankyCommand<typeof VerifyContract> {
  static description = "Verify the smart contract(s) in your contracts directory";

  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to verify all contracts",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to verify",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(VerifyContract);

    const localConfig = getSwankyConfig("local") as SwankyConfig;

    const cargoContractVersion = extractCargoContractVersion();
    if (cargoContractVersion === null)
      throw new InputError(
        `Cargo contract tool is required for verifiable mode. Please ensure it is installed.`
      );

    ensureCargoContractVersionCompatibility(cargoContractVersion, "4.0.0", [
      "4.0.0-alpha",
    ]);

    ensureContractNameOrAllFlagIsSet(args, flags);

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];

    const spinner = new Spinner();

    for (const contractName of contractNames) {
      this.logger.info(`Started compiling contract [${contractName}]`);

      const contractRecord = findContractRecord(this.swankyConfig, contractName);

      await ensureContractPathExists(contractName);


      if(!contractRecord.build) {
        throw new InputError(`Contract ${contractName} is not compiled. Please compile it first`);
      }

      await spinner.runCommand(
        async () => {
            return new Promise<boolean>((resolve, reject) => {
              if(contractRecord.build!.isVerified) {
                this.logger.info(`Contract ${contractName} is already verified`);
                resolve(true);
              }
              const compileArgs = [
                "contract",
                "verify",
                `artifacts/${contractName}/${contractName}.contract`,
                "--manifest-path",
                `contracts/${contractName}/Cargo.toml`,
              ];
              const compile = spawn("cargo", compileArgs);
              this.logger.info(`Running verify command: [${JSON.stringify(compile.spawnargs)}]`);
              let outputBuffer = "";
              let errorBuffer = "";

              compile.stdout.on("data", (data) => {
                outputBuffer += data.toString();
                spinner.ora.clear();
              });

              compile.stderr.on("data", (data) => {
                errorBuffer += data;
              });

              compile.on("exit", (code) => {
                if (code === 0) {
                  const regex = /Successfully verified contract (.*) against reference contract (.*)/;
                  const match = outputBuffer.match(regex);
                  if (match) {
                    this.logger.info(`Contract ${contractName} verification done.`);
                    resolve(true);
                  }
                } else {
                  reject(new ProcessError(errorBuffer));
                }
              });
            });
          },
        `Verifying ${contractName} contract`,
        `${contractName} Contract verified successfully`
      );

      await this.spinner.runCommand(async () => {
        const buildData = {
          ...contractRecord.build,
          isVerified: true
        } as BuildData;
      
        const newLocalConfig = new ConfigBuilder(localConfig)
          .addContractBuild(args.contractName, buildData)
          .build();
      
        await this.storeConfig(newLocalConfig, "local");
      }, "Writing config");

    }
  }
}
