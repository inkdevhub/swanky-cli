import { Args, Flags } from "@oclif/core";
import path from "node:path";
import { ensureDir, pathExists, pathExistsSync, writeJSON } from "fs-extra/esm";
import {
  checkCliDependencies,
  copyContractTemplateFiles,
  processTemplates,
  getTemplates,
  prepareTestFiles,
} from "../../lib/index.js";
import { email, name, pickTemplate } from "../../lib/prompts.js";
import { paramCase, pascalCase, snakeCase } from "change-case";
import { execaCommandSync } from "execa";
import inquirer from "inquirer";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { InputError } from "../../lib/errors.js";

export class NewContract extends SwankyCommand<typeof NewContract> {
  static description = "Generate a new smart contract template inside a project";

  static flags = {
    template: Flags.string({
      options: getTemplates().contractTemplatesList,
    }),
    verbose: Flags.boolean({ char: "v" }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: true,
      description: "Name of the new contract",
    }),
  };

  async run(): Promise<void> {
    const projectPath = process.cwd();
    const { args, flags } = await this.parse(NewContract);

    if (await pathExists(path.resolve(projectPath, "contracts", args.contractName))) {
      throw new InputError(`Contract folder '${args.contractName}' already exists`);
    }

    if (this.swankyConfig.contracts[args.contractName]) {
      throw new InputError(
        `Contract with a name '${args.contractName}' already exists in swanky.config`
      );
    }

    const templates = getTemplates();

    const { contractTemplate } = flags.template
      ? { contractTemplate: flags.template }
      : await inquirer.prompt([pickTemplate(templates.contractTemplatesList)]);

    const questions = [
      name(
        "author",
        () => execaCommandSync("git config --get user.name").stdout,
        "What is your name?"
      ),
      email(),
    ];

    const answers = await inquirer.prompt(questions);

    await this.spinner.runCommand(
      () => checkCliDependencies(this.spinner),
      "Checking dependencies"
    );

    await this.spinner.runCommand(
      () =>
        copyContractTemplateFiles(
          path.resolve(templates.contractTemplatesPath, contractTemplate),
          args.contractName,
          projectPath
        ),
      "Copying contract template files"
    );

    if (contractTemplate === "psp22") {
      const e2eTestHelpersPath = path.resolve(projectPath, "tests", "test_helpers");
      if (!pathExistsSync(e2eTestHelpersPath)) {
        await this.spinner.runCommand(
          () => prepareTestFiles("e2e", path.resolve(templates.templatesPath), projectPath),
          "Copying e2e test helpers"
        );
      } else {
        console.log("e2e test helpers already exist. No files were copied.");
      }
    }

    await this.spinner.runCommand(
      () =>
        processTemplates(projectPath, {
          project_name: paramCase(this.config.pjson.name),
          author_name: answers.authorName,
          author_email: answers.email,
          swanky_version: this.config.pjson.version,
          contract_name: args.contractName,
          contract_name_snake: snakeCase(args.contractName),
          contract_name_pascal: pascalCase(args.contractName),
        }),
      "Processing contract templates"
    );

    await ensureDir(path.resolve(projectPath, "artifacts", args.contractName));

    await this.spinner.runCommand(async () => {
      this.swankyConfig.contracts[args.contractName] = {
        name: args.contractName,
        moduleName: snakeCase(args.contractName),
        deployments: [],
      };

      await writeJSON(path.resolve("swanky.config.json"), this.swankyConfig, { spaces: 2 });
    }, "Writing config");

    this.log("😎 New contract successfully generated! 😎");
  }
}
