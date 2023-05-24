import { Args, Command, Flags } from "@oclif/core";
import path from "node:path";
import { ensureDir, pathExists, writeJSON } from "fs-extra/esm";
import {
  getSwankyConfig,
  ensureSwankyProject,
  Spinner,
  checkCliDependencies,
  copyContractTemplateFiles,
  processTemplates,
  getTemplates,
} from "../../lib/index.js";
import { email, name, pickTemplate } from "../../lib/prompts.js";
import { paramCase, pascalCase, snakeCase } from "change-case";
import execa = require("execa");
import inquirer = require("inquirer");

export class NewContract extends Command {
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
    await ensureSwankyProject();

    const config = await getSwankyConfig();

    const projectPath = process.cwd();
    const { args, flags } = await this.parse(NewContract);

    if (await pathExists(path.resolve(projectPath, "contracts", args.contractName))) {
      throw new Error(`Contract folder '${args.contractName}' already exists`);
    }

    if (config.contracts[args.contractName]) {
      throw new Error(
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
        () => execa.commandSync("git config --get user.name").stdout,
        "What is your name?"
      ),
      email(),
    ];

    const answers = await inquirer.prompt(questions);

    const spinner = new Spinner(flags.verbose);

    await spinner.runCommand(() => checkCliDependencies(spinner), "Checking dependencies");

    await spinner.runCommand(
      () =>
        copyContractTemplateFiles(
          path.resolve(templates.contractTemplatesPath, contractTemplate),
          args.contractName,
          projectPath
        ),
      "Copying contract template files"
    );

    await spinner.runCommand(
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
    await ensureDir(path.resolve(projectPath, "tests", args.contractName));

    await spinner.runCommand(async () => {
      config.contracts[args.contractName] = {
        name: args.contractName,
        moduleName: snakeCase(args.contractName),
        deployments: [],
      };

      await writeJSON(path.resolve("swanky.config.json"), config, { spaces: 2 });
    }, "Writing config");

    this.log("😎 New contract successfully generated! 😎");
  }
}
