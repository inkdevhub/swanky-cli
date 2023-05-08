import { Args, Command, Flags } from "@oclif/core";
import path = require("node:path");
import { ensureDir, pathExistsSync, readJSON, writeJSON } from "fs-extra";
import {
  getSwankyConfig,
  ensureSwankyProject,
  Spinner,
  checkCliDependencies,
  copyContractTemplateFiles,
  processTemplates,
} from "@astar-network/swanky-core";
import { getAllTemplateNames, getTemplates } from "@astar-network/swanky-templates";
import { email, name, pickLanguage, pickTemplate } from "../../lib/prompts";
import { paramCase, pascalCase, snakeCase } from "change-case";
import execa = require("execa");
import inquirer = require("inquirer");

export class NewContract extends Command {
  static description = "Generate a new smart contract template inside a project";

  static flags = {
    template: Flags.string({
      options: getAllTemplateNames(),
    }),
    language: Flags.string({
      options: ["ink", "ask"],
      char: "l",
      required: false,
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

    const projectPath = path.resolve();
    const { args, flags } = await this.parse(NewContract);

    if (
      pathExistsSync(path.join(projectPath, "contracts", args.contractName)) ||
      config.contracts[args.contractName]
    ) {
      throw new Error(`Contract folder '${args.contractName}' already exists`);
    }

    const { contractLanguage } = flags.language
      ? { contractLanguage: flags.language }
      : await inquirer.prompt([pickLanguage()]);

    const templates = getTemplates(contractLanguage);

    const { contractTemplate } = flags.template
      ? { contractTemplate: flags.template }
      : await inquirer.prompt([pickTemplate(templates.contractTemplatesQueryPairs)]);

    // passing language and template by flags can result in a non-existing combination
    if (!templates.contractTemplateNames.includes(contractTemplate)) {
      this.error(
        `Selected template [${contractLanguage}] does not exist for selected language [${contractLanguage}]`
      );
    }

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
          contract_language: contractLanguage,
        }),
      "Processing contract templates"
    );

    await ensureDir(path.resolve(projectPath, "artifacts", args.contractName));
    await ensureDir(path.resolve(projectPath, "tests", args.contractName));
    if (contractLanguage === "ask") {
      await spinner.runCommand(async () => {
        const pjson = await readJSON("package.json");
        const deps = Object.keys(pjson.dependencies || {});
        if (!deps.includes("ask-lang")) {
          await execa.command("yarn add ask-lang");
          await execa.command("yarn add ask-transform assemblyscript@0.19 -D");
        }
      }, "Installing Ask!");
    }
    await spinner.runCommand(async () => {
      config.contracts[args.contractName] = {
        name: args.contractName,
        language: contractLanguage,
        deployments: [],
      };

      await writeJSON(path.resolve("swanky.config.json"), config, { spaces: 2 });
    }, "Writing config");

    this.log("😎 New contract successfully generated! 😎");
  }
}
