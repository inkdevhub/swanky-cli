import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import * as fs from 'fs-extra';
import { getTemplates } from "../init";
import { ensureSwankyProject } from "../../lib/command-utils";
import { email, name, pickTemplate } from "../../lib/prompts";
import { Spinner } from "../../lib/spinner";
import {
  checkCliDependencies,
  copyContractTemplateFiles,
  processTemplates,
} from "../../lib/tasks";
import { paramCase, pascalCase, snakeCase } from "change-case";
import execa = require("execa");
import inquirer = require("inquirer");

export class NewContract extends Command {
  static description = "Generate a new smart contract template";

  static flags = {
    template: Flags.string({
      options: getTemplates().contractTemplatesList.map((template) => template.value),
    }),
    verbose: Flags.boolean({ char: "v" }),
  }

  static args = [
    {
      name: "contractName",
      required: true,
      description: "name of new contract"
    }
  ]

  async run(): Promise<void> {
    await ensureSwankyProject();

    const projectPath = path.resolve();
    const { args, flags } = await this.parse(NewContract);

    if (fs.existsSync(path.join(projectPath, "contracts", args.contractName))) {
      throw Error(`Contract folder '${args.contractName}' already exists`);
    }

    const templates = getTemplates();

    const questions = [
      pickTemplate(templates.contractTemplatesList),
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
          path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
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
          contract_name_snake: snakeCase(args.contractName),
          contract_name_pascal: pascalCase(args.contractName),
        }),
        "Processing contract templates"
      );

    this.log("😎 New contract successfully scaffolded! 😎");
  }
}
