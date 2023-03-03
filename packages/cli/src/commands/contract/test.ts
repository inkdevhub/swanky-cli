require("ts-mocha");
import { Command } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
import globby from "globby";
import Mocha from "mocha";
import { ensureDir } from "fs-extra";
import * as shell from "shelljs";

declare global {
  var contractTypesPath: string; // eslint-disable-line no-var
}

export class CompileContract extends Command {
  static description = "Run tests for a given contact";

  // hidden until the mocha loading issue is resolved
  static hidden = true;

  static args = [
    {
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile",
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const config = await getSwankyConfig();

    let contractList = readdirSync(path.resolve("contracts"));
    if (args.contractName !== "") {
      if (!config.contracts[args.contractName]) {
        this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
      }

      if (!contractList.includes(args.contractName)) {
        this.error(`Path to contract ${args.contractName} does not exist: ${path.resolve("contracts", args.contractName)}`);
      }

      // remove unselected contracts from contractList to compile
      contractList = contractList.filter(contractName => contractName === args.contractName);
    } else {
      if (contractList.length === 0) {
        this.error("Nothing to test");
      }
      for (const contractName of contractList) {
        console.log(`${contractName} contract is found`)
      }
    }

    const projectDir = path.resolve();
    const testDir = path.resolve("test");
    console.log(projectDir)
    console.log(testDir);
    for (const contractName of contractList) {
      const contractInfo = config.contracts[contractName];

      if (!contractInfo.build) {
        this.error(`Cannot find build data for ${contractName} contract in swanky.config.json`);
      }
      const buildData = contractInfo.build;

      const reportDir = path.resolve(projectDir, buildData.artifactsPath, "testReports", Date.now().toString());
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
      } catch (error) {
        this.error(error as string);
      }
    }
  }
}
