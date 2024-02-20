import { Args, Flags } from "@oclif/core";
import { getTemplates, prepareTestFiles, processTemplates } from "../../../lib/index.js";
import { Contract } from "../../../lib/contract.js";
import { SwankyCommand } from "../../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../../lib/errors.js";
import path from "node:path";
import { existsSync } from "node:fs";
import inquirer from "inquirer";
import { paramCase, pascalCase } from "change-case";
import { TestType } from "../../../index.js";

export class GenerateTests extends SwankyCommand<typeof GenerateTests> {
  static description = "Generate test files for the specified contract";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the contract",
    }),
  };

  static flags = {
    template: Flags.string({
      options: getTemplates().contractTemplatesList,
    }),
    mocha: Flags.boolean({
      default: false,
      description: "Generate mocha test files",
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

    const testType: TestType = flags.mocha ? "mocha" : "e2e";
    const testsFolderPath = path.resolve("tests");
    const testPath = this.getTestPath(testType, testsFolderPath, args.contractName);

    const templates = getTemplates();
    const templateName = await this.resolveTemplateName(flags, templates.contractTemplatesList);

    const overwrite = await this.checkOverwrite(testPath, args.contractName, testType);
    if (!overwrite) return;

    await this.generateTests(
      testType,
      templates.templatesPath,
      process.cwd(),
      args.contractName,
      templateName
    );
  }

  async checkOverwrite(
    testPath: string,
    contractName: string,
    testType: TestType
  ): Promise<boolean> {
    if (!existsSync(testPath)) return true; // No need to overwrite
    const message =
      testType === "e2e"
        ? "Test helpers already exist. Overwrite?"
        : `Mocha tests for ${contractName} already exist. Overwrite?`;

    const { overwrite } = await inquirer.prompt({
      type: "confirm",
      name: "overwrite",
      message,
      default: false,
    });

    return overwrite;
  }

  getTestPath(testType: TestType, testsPath: string, contractName: string): string {
    return testType === "e2e"
      ? path.resolve(testsPath, "test_helpers")
      : path.resolve(testsPath, contractName, "index.test.ts");
  }

  async resolveTemplateName(flags: any, templates: any): Promise<string | undefined> {
    if (flags.mocha && !flags.template) {
      if (!templates?.length) throw new ConfigError("Template list is empty!");
      const response = await inquirer.prompt([{
        type: "list",
        name: "template",
        message: "Choose a contract template:",
        choices: templates,
      }]);
      return response.template;
    }
    return flags.template;
  }

  async generateTests(
    testType: TestType,
    templatesPath: string,
    projectPath: string,
    contractName: string,
    templateName?: string
  ): Promise<void> {
    if (testType === "e2e") {
      await this.spinner.runCommand(
        () => prepareTestFiles("e2e", templatesPath, projectPath),
        "Generating e2e test helpers"
      );
    } else {
      await this.spinner.runCommand(
        () => prepareTestFiles("mocha", templatesPath, projectPath, templateName, contractName),
        `Generating tests for ${contractName} with mocha`
      );
    }
    await this.spinner.runCommand(
      () =>
        processTemplates(projectPath, {
          project_name: paramCase(this.config.pjson.name),
          swanky_version: this.config.pjson.version,
          contract_name: contractName,
          contract_name_pascal: pascalCase(contractName),
        }),
      "Processing templates"
    );
  }
}
