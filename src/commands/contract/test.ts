import "ts-mocha";
import { Flags, Args } from "@oclif/core";
import path from "node:path";
import { globby } from "globby";
import Mocha from "mocha";
import { emptyDir, pathExistsSync } from "fs-extra/esm";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { FileError, ProcessError, TestError } from "../../lib/errors.js";
import { spawn } from "node:child_process";
import { findContractRecord, Spinner } from "../../lib/index.js";
import {
  contractFromRecord,
  ensureArtifactsExist,
  ensureContractNameOrAllFlagIsSet,
  ensureTypedContractExists,
} from "../../lib/checks.js";

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

    ensureContractNameOrAllFlagIsSet(args, flags);

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];

    const spinner = new Spinner();

    for (const contractName of contractNames) {
      const contractRecord = findContractRecord(this.swankyConfig, contractName);

      const contract = await contractFromRecord(contractRecord);

      console.log(`Testing contract: ${contractName}`);

      if (flags.mocha) {
        await this.runMochaTests(contract);
      } else {
        await spinner.runCommand(
          async () => {
            return new Promise<string>((resolve, reject) => {
              const compileArgs = [
                "test",
                "--features",
                "e2e-tests",
                "--manifest-path",
                `contracts/${contractName}/Cargo.toml`,
                "--release",
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
      }
    }
  }

  async runMochaTests(contract: Contract): Promise<void> {
    const testDir = path.resolve("tests", contract.name);
    if (!pathExistsSync(testDir)) {
      throw new FileError(`Test directory does not exist: ${testDir}`);
    }

    await ensureArtifactsExist(contract);

    await ensureTypedContractExists(contract);

    const reportDir = path.resolve(testDir, "testReports");
    await emptyDir(reportDir);

    const mocha = new Mocha({
      timeout: 200000,
      reporter: "mochawesome",
      reporterOptions: {
        reportDir,
        quiet: true,
      },
    });

    const testFiles = await globby(`${testDir}/*.test.ts`);
    testFiles.forEach((file) => mocha.addFile(file));

    global.contractTypesPath = path.resolve(testDir, "typedContract");

    try {
      await new Promise<void>((resolve, reject) => {
        mocha.run((failures) => {
          if (failures) {
            reject(new Error(`Tests failed. See report: ${reportDir}`));
          } else {
            console.log(`All tests passed. See report: ${reportDir}`);
            resolve();
          }
        });
      });
    } catch (error) {
      throw new TestError("Mocha tests failed", { cause: error });
    }
  }
}
