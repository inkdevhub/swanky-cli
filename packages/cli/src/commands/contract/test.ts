require("ts-mocha");
import { Command, Flags, Args } from "@oclif/core";
import path = require("node:path");
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
import globby from "globby";
import Mocha from "mocha";
import { ensureDir } from "fs-extra";
import * as shell from "shelljs";

declare global {
  var contractTypesPath: string; // eslint-disable-line no-var
}

export class TestContract extends Command {
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

    await ensureSwankyProject();
    const config = await getSwankyConfig();

    const contractNames = [];
    if (flags.all) {
      for (const contractName of Object.keys(config.contracts)) {
        console.log(`${contractName} contract is found`);
        contractNames.push(contractName);
      }
    } else {
      contractNames.push(args.contractName);
    }

    const projectDir = path.resolve();
    const testDir = path.resolve("test");
    const typedContractsDir = path.resolve("typedCotracts")
    for (const contractName of contractNames) {
      const contractInfo = config.contracts[contractName];
      if (!contractInfo.build) {
        this.error(`Cannot find build data for ${contractName} contract in swanky.config.json`);
      }
      const buildData = contractInfo.build;

      const reportDir = path.resolve(
        projectDir,
        buildData.artifactsPath,
        "testReports",
        Date.now().toString()
      );
      await ensureDir(reportDir);

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

      mocha.addFile;
      tests.forEach((test) => {
        mocha.addFile(test);
      });

      global.contractTypesPath = path.resolve(typedContractsDir, contractName);

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
      } catch (error) {
        this.error(error as string);
      }
    }
  }
}
