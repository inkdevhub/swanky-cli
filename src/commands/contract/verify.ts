import { Args, Flags } from "@oclif/core";
import path from "node:path";
import { ensureCargoContractVersionCompatibility, extractCargoContractVersion, Spinner } from "../../lib/index.js";
import { pathExists } from "fs-extra/esm";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, InputError, ProcessError } from "../../lib/errors.js";
import { spawn } from "node:child_process";

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

    const cargoContractVersion = extractCargoContractVersion();
    if (cargoContractVersion === null)
      throw new InputError(
        `Cargo contract tool is required for verifiable mode. Please ensure it is installed.`
      );

    ensureCargoContractVersionCompatibility(cargoContractVersion, "4.0.0", [
      "4.0.0-alpha",
    ]);

    if (args.contractName === undefined && !flags.all) {
      throw new InputError("No contracts were selected to verify", { winston: { stack: true } });
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
          `Cannot find contract info for ${contractName} contract in swanky.config.json`
        );
      }
      const contractPath = path.resolve("contracts", contractInfo.name);
      this.logger.info(`"Looking for contract ${contractInfo.name} in path: [${contractPath}]`);
      if (!(await pathExists(contractPath))) {
        throw new InputError(`Contract folder not found at expected path`);
      }

      if(!contractInfo.build) {
        throw new InputError(`Contract ${contractName} is not compiled. Please compile it first`);
      }

      await spinner.runCommand(
        async () => {
            return new Promise<boolean>((resolve, reject) => {
              if(contractInfo.build!.isVerified) {
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
      contractInfo.build.isVerified = true;

      this.swankyConfig.contracts[contractName] = contractInfo;

      await this.storeConfig();
    }
  }
}
