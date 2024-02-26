import "ts-mocha";
import { Flags, Args } from "@oclif/core";
import path from "node:path";
import { globby } from "globby";
import Mocha from "mocha";
import { emptyDir, pathExistsSync } from "fs-extra/esm";
import shell from "shelljs";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError, InputError, ProcessError, TestError } from "../../lib/errors.js";
import { spawn } from "node:child_process";
import { Spinner } from "../../lib/index.js";

declare global {
  var contractTypesPath: string; // eslint-disable-line no-var
}

export class TestContract extends SwankyCommand<typeof TestContract> {
  static description = "Run tests for a given contact";

  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Run tests for all contracts",
    }),
    mocha: Flags.boolean({
        default: false,
        description: "Run tests with mocha",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      default: "",
      description: "Name of the contract to test",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TestContract);

    if (args.contractName === undefined && !flags.all) {
      throw new InputError("No contracts were selected to compile");
    }

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];

    const spinner = new Spinner();

    for (const contractName of contractNames) {
      const contractRecord = this.swankyConfig.contracts[contractName];
      if (!contractRecord) {
        throw new ConfigError(
          `Cannot find a contract named ${args.contractName} in swanky.config.json`
        );
      }

      const contract = new Contract(contractRecord);

      if (!(await contract.pathExists())) {
        throw new FileError(
          `Path to contract ${args.contractName} does not exist: ${contract.contractPath}`
        );
      }

      console.log(`Testing contract: ${contractName}`);

      if (!flags.mocha) {
        await spinner.runCommand(
          async () => {
            return new Promise<string>((resolve, reject) => {
              const compileArgs = [
                "test",
                "--features",
                "e2e-tests",
                "--manifest-path",
                `contracts/${contractName}/Cargo.toml`,
                "--release"
              ];

              const compile = spawn("cargo", compileArgs);
              this.logger.info(`Running e2e-tests command: [${JSON.stringify(compile.spawnargs)}]`);
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
                  const regex = /test result: (.*)/;
                  const match = outputBuffer.match(regex);
                  if (match) {
                    this.logger.info(`Contract ${contractName} e2e-testing done.`);
                    resolve(match[1]);
                  }
                } else {
                  reject(new ProcessError(errorBuffer));
                }
              });
            });
          },
          `Testing ${contractName} contract`,
          `${contractName} testing finished successfully`
        );
      } else {

        const testDir = path.resolve("tests");

        if (!pathExistsSync(testDir)) {
          throw new FileError(`Tests folder does not exist: ${testDir}`);
        }

        const artifactsCheck = await contract.artifactsExist();

        if (!artifactsCheck.result) {
          throw new FileError(
            `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
          );
        }

        const artifactPath = path.resolve("typedContracts", `${contractName}`);
        const typedContractCheck = await contract.typedContractExists(contractName);

        this.log(`artifactPath: ${artifactPath}`);

        if (!typedContractCheck.result) {
          throw new FileError(
            `No typed contract found at path: ${typedContractCheck.missingPaths.toString()}`
          );
        }

        const reportDir = path.resolve(testDir, contract.name, "testReports");

        await emptyDir(reportDir);

        const mocha = new Mocha({
          timeout: 200000,
          reporter: "mochawesome",
          reporterOptions: {
            reportDir,
            charts: true,
            reportTitle: `${contractName} test report`,
            quiet: true,
            json: false,
          },
        });

        const tests = await globby(`${path.resolve(testDir, contractName)}/*.test.ts`);

        tests.forEach((test) => {
          mocha.addFile(test);
        });

        global.contractTypesPath = path.resolve(testDir, contractName, "typedContract");

        shell.cd(`${testDir}/${contractName}`);
        try {
          await new Promise<void>((resolve, reject) => {
            mocha.run((failures) => {
              if (failures) {
                reject(`At least one of the tests failed. Check report for details: ${reportDir}`);
              } else {
                this.log(`All tests passing. Check the report for details: ${reportDir}`);
                resolve();
              }
            });
          });
        } catch (cause) {
          throw new TestError("Error in test", { cause });
        }
      }
    }
  }
}
