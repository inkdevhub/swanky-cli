import { Args, Flags } from "@oclif/core";
import { getTemplates, prepareTestFiles, processTemplates } from "../../../lib/index.js";
import { Contract } from "../../../lib/contract.js";
import { SwankyCommand } from "../../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../../lib/errors.js";
import path from "node:path";
import { existsSync } from "node:fs";
import inquirer from "inquirer";
import { pascalCase } from "change-case";

export class GenerateTests extends SwankyCommand<typeof GenerateTests> {
  static description = "Generate types from compiled contract metadata";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

  static flags = {
    mocha: Flags.boolean({
      default: false,
      description: "Generate tests with mocha",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(GenerateTests);

    const contractRecord = this.swankyConfig.contracts[args.contractName];
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

    const artifactsCheck = await contract.artifactsExist();

    if (!artifactsCheck.result) {
      throw new FileError(
        `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
      );
    }

    const templates = getTemplates();

    const testsPath = path.resolve(process.cwd(), "tests");

    let owerwrite = true;
    if (!flags.mocha)
    {
      if (existsSync(path.resolve(testsPath, "test_helpers"))) {
        owerwrite = (await inquirer.prompt({
          type: "confirm",
          name: "overwrite",
          message: "Test helpers already exist. Overwrite?",
          default: false,
        })).overwrite;
      }
      if (owerwrite) {
        await this.spinner.runCommand(async () => {
          await prepareTestFiles("e2e", templates.templatesPath, process.cwd(), args.contractName);
        }, "Generating test helpers");
      }
    } else {
      if (existsSync(path.resolve(testsPath, args.contractName, "index.test.ts"))) {
        owerwrite = (await inquirer.prompt({
          type: "confirm",
          name: "overwrite",
          message: `Mocha tests for ${args.contractName} are already exist. Overwrite?`,
          default: false,
        })).overwrite;
      }
      if (owerwrite) {
        await this.spinner.runCommand(async () => {
          await prepareTestFiles("mocha", templates.templatesPath, process.cwd(), args.contractName);
        }, `Generating tests for ${args.contractName} with mocha`);
        await this.spinner.runCommand(async () => {
          await processTemplates(process.cwd(), {
            contract_name: args.contractName,
            contract_name_pascal: pascalCase(args.contractName),
          })
        }, 'Processing templates')
      }
    }
  }
}
