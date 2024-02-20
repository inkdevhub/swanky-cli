import { Args, Flags } from "@oclif/core";
import { getTemplates, prepareTestFiles, processTemplates } from "../../lib/index.js";
import { Contract } from "../../lib/contract.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError, InputError } from "../../lib/errors.js";
import path from "node:path";
import { existsSync } from "node:fs";
import inquirer from "inquirer";
import { paramCase, pascalCase } from "change-case";
import { TestType } from "../../index.js";

export class GenerateTests extends SwankyCommand<typeof GenerateTests> {
  static description = "Generate test files for the specified contract";

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
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

    if (flags.mocha) {
      if (!args.contractName) {
        throw new InputError("The 'contractName' argument is required to generate mocha tests.");
      }

      await this.checkContract(args.contractName)
    }

    const testType: TestType = flags.mocha ? "mocha" : "e2e";
    const testsFolderPath = path.resolve("tests");
    const testPath = this.getTestPath(testType, testsFolderPath, args.contractName);

    const templates = getTemplates();
    const templateName = await this.resolveTemplateName(flags, templates.contractTemplatesList);

    const overwrite = await this.checkOverwrite(testPath, testType, args.contractName);
    if (!overwrite) return;

    await this.generateTests(
      testType,
      templates.templatesPath,
      process.cwd(),
      args.contractName,
      templateName
    );
  }

  async checkContract(name: string) {
    const contractRecord = this.swankyConfig.contracts[name];
      if (!contractRecord) {
        throw new ConfigError(
          `Cannot find a contract named ${name} in swanky.config.json`
        );
      }

      const contract = new Contract(contractRecord);
      if (!(await contract.pathExists())) {
        throw new FileError(
          `Path to contract ${name} does not exist: ${contract.contractPath}`
        );
      }

      const artifactsCheck = await contract.artifactsExist();
      if (!artifactsCheck.result) {
        throw new FileError(
          `No artifact file found at path: ${artifactsCheck.missingPaths.toString()}`
        );
      }
  }

  async checkOverwrite(
    testPath: string,
    testType: TestType,
    contractName?: string
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

  getTestPath(testType: TestType, testsPath: string, contractName?: string): string {
    if (testType === "e2e") {
      return path.resolve(testsPath, "test_helpers");
    } else if (testType === "mocha" && contractName) {
      return path.resolve(testsPath, contractName, "index.test.ts");
    } else {
      throw new InputError("The 'contractName' argument is required to generate mocha tests.");
    }
  }

  async resolveTemplateName(flags: any, templates: any): Promise<string | undefined> {
    if (flags.mocha && !flags.template) {
      if (!templates?.length) throw new ConfigError("Template list is empty!");
      const response = await inquirer.prompt([
        {
          type: "list",
          name: "template",
          message: "Choose a contract template:",
          choices: templates,
        },
      ]);
      return response.template;
    }
    return flags.template;
  }

  async generateTests(
    testType: TestType,
    templatesPath: string,
    projectPath: string,
    contractName?: string,
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
          contract_name: contractName ?? "",
          contract_name_pascal: contractName ? pascalCase(contractName) : "",
        }),
      "Processing templates"
    );
  }
}
