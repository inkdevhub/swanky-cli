import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { readdirSync, writeJSON } from "fs-extra";
import { swankyNode } from "../../lib/nodeInfo";
import {
  checkCliDependencies,
  copyTemplateFiles,
  downloadNode,
  installDeps,
  processTemplates,
} from "../../lib/tasks";
import execa = require("execa");
import { paramCase, pascalCase, snakeCase } from "change-case";
import inquirer = require("inquirer");
import { choice, email, name, pickTemplate } from "../../lib/prompts";
import task from "tasuku";
import { Spinner } from "../../lib/spinner";

export interface SwankyConfig {
  platform: string;
  language?: string;
  contractTemplate?: string;
  project_name: string;
  nodeTargetDir?: string;
  nodeFileName?: string;
  contracts?: { name: string; address: string }[];
  node: {
    type?: string;
    localPath?: string;
    url?: string;
    supportedInk?: string;
    nodeAddress?: string;
  };
  author: {
    name: string;
    email: string;
  };
  accounts: { alias: string; mnemonic: string }[];
  contractName?: string;
}

function getTemplates(language = "ink") {
  const templatesPath = path.resolve(__dirname, "../..", "templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts", language);
  const fileList = readdirSync(contractTemplatesPath, {
    withFileTypes: true,
  });
  const contractTemplatesList = fileList
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      message: entry.name,
      value: entry.name,
    }));

  return { templatesPath, contractTemplatesPath, contractTemplatesList };
}

export class Init extends Command {
  static description = "Generate a new smart contract environment";

  static flags = {
    "swanky-node": Flags.boolean(),
    template: Flags.string({
      options: getTemplates().contractTemplatesList.map((template) => template.value),
    }),
    verbose: Flags.boolean({ char: "v" }),
  };

  static args = [
    {
      name: "projectName",
      required: true,
      description: "directory name of new project",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);

    const projectPath = path.resolve(args.projectName);
    const templates = getTemplates();

    const questions = [
      pickTemplate(templates.contractTemplatesList),
      name("contract", (ans) => ans.contractTemplate, "What should we name your contract?"),
      name(
        "author",
        () => execa.commandSync("git config --get user.name").stdout,
        "What is your name?"
      ),
      email(),
    ];

    if (!flags["swanky-node"]) {
      questions.push(choice("useSwankyNode", "Do you want to download Swanky node?"));
    }

    const answers = await inquirer.prompt(questions);

    const spinner = new Spinner(flags.verbose);

    await spinner.runCommand(
      () => checkCliDependencies(spinner),
      "Checking",
      "Deps ok",
      "Deps failed"
    );

    // try {
    //   spinner.start("Checking dependencies");
    //   await checkCliDependencies(spinner);
    //   spinner.succeed("Dependencies OK!");
    // } catch (error) {
    //   spinner.fail("Dependencies not installed, check web: ");
    //   if (flags.verbose) console.error(error);
    // }

    // await checkCliDependencies();

    // await copyTemplateFiles(
    //   templates.templatesPath,
    //   path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
    //   answers.contractName,
    //   projectPath
    // );

    // await processTemplates(projectPath, {
    //   project_name: paramCase(args.projectName),
    //   author_name: answers.authorName,
    //   author_email: answers.email,
    //   swanky_version: this.config.pjson.version,
    //   contract_name_snake: snakeCase(answers.contractName),
    //   contract_name_pascal: pascalCase(answers.contractName),
    // });

    // await execa.command("git init", { cwd: projectPath });

    // let nodePath = "";
    // if (flags["swanky-node"] || answers.useSwankyNode) {
    //   const taskResult = await downloadNode(projectPath, swankyNode);
    //   nodePath = taskResult.result;
    // }

    // await installDeps(projectPath);

    // await writeJSON(
    //   path.resolve(projectPath, "swanky.config.json"),
    //   {
    //     node: {
    //       localPath: nodePath,
    //       nodeAddress: "ws://127.0.0.1:9944",
    //     },
    //     accounts: [
    //       {
    //         alias: "alice",
    //         mnemonic: "//Alice",
    //       },
    //       {
    //         alias: "bob",
    //         mnemonic: "//Bob",
    //       },
    //     ],
    //   },
    //   { spaces: 2 }
    // );

    // task("Swanky project successfully initialised!", async () => {
    //   return;
    // });
  }
}
