import "ts-mocha";
import { Flags, Args } from "@oclif/core";
import path from "node:path";
import { globby } from "globby";
import Mocha from "mocha";
import { emptyDir } from "fs-extra/esm";
import shell from "shelljs";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { TestError } from "../../lib/errors.js";

declare global {
  var contractTypesPath: string; // eslint-disable-line no-var
}

export class TestContract extends SwankyCommand<typeof TestContract> {
  static description = "Run tests for a given contact";

  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to compile all contracts",
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
      this.error("No contracts were selected to compile");
    }

    const contractNames = flags.all
      ? Object.keys(this.swankyConfig.contracts)
      : [args.contractName];

    const testDir = path.resolve("tests");

    for (const contractName of contractNames) {
      const contractRecord = this.swankyConfig.contracts[contractName];
      if (!contractRecord) {
        this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
      }

      const contract = new Contract(contractRecord);

      if (!(await contract.pathExists())) {
        this.error(
          `Path to contract ${args.contractName} does not exist: ${contract.contractPath}`
        );
      }

      const artifactsCheck = await contract.artifactsExist();

      if (!artifactsCheck.result) {
        this.error(`No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`);
      }

      console.log(`Testing contract: ${contractName}`);

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
