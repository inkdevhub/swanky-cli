import { Command } from "@oclif/core";
import path = require("node:path");
import { readdirSync } from "node:fs";
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
import globby from "globby";
import Mocha from "mocha";
import { ensureDir } from "fs-extra";

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
      required: true,
      description: "Name of the contract to compile",
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const config = await getSwankyConfig();

    const contractInfo = config.contracts[args.contractName];
    if (!contractInfo) {
      this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
    }

    const contractList = readdirSync(path.resolve("contracts"));

    const contractPath = path.resolve("contracts", args.contractName);
    if (!contractList.includes(args.contractName)) {
      this.error(`Path to contract ${args.contractName} does not exist: ${contractPath}`);
    }

    if (!contractInfo.build) {
      this.error(`Cannot find build data for ${args.contractName} contract in swanky.config.json`);
    }
    const buildData = contractInfo.build;

    const reportDir = path.resolve(buildData.artifactsPath, "testReports", Date.now().toString());
    await ensureDir(reportDir);

    const mocha = new Mocha({
      timeout: 200000,
      reporter: "mochawesome",
      reporterOptions: {
        reportDir,
        charts: true,
        reportTitle: `${args.contractName} test report`,
        quiet: true,
        json: false,
      },
    });

    const tests = await globby(`${path.resolve("test", args.contractName)}/*.test.ts`);

    mocha.addFile;
    tests.forEach((test) => {
      mocha.addFile(test);
    });

    global.contractTypesPath = path.resolve("test", args.contractName, "typedContract");
    mocha.run((failures) => {
      if (failures) {
        this.error(`At least one of the tests failed. Check report for details: ${reportDir}`);
      } else {
        this.log(`All tests passing. Check the report for details: ${reportDir}`);
      }
    });
  }
}
