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
import { Spinner } from "../../lib/spinner";

export interface SwankyConfig {
  node: {
    polkadotPalletVersions: string;
    localPath: string;
    supportedInk: string;
    nodeAddress: string;
  };
  accounts: { alias: string; mnemonic: string }[];
  contracts?: { name: string; address: string }[];
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

    await spinner.runCommand(() => checkCliDependencies(spinner), "Checking dependencies");

    await spinner.runCommand(
      () =>
        copyTemplateFiles(
          templates.templatesPath,
          path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
          answers.contractName,
          projectPath
        ),
      "Copying template files"
    );

    await spinner.runCommand(
      () =>
        processTemplates(projectPath, {
          project_name: paramCase(args.projectName),
          author_name: answers.authorName,
          author_email: answers.email,
          swanky_version: this.config.pjson.version,
          contract_name_snake: snakeCase(answers.contractName),
          contract_name_pascal: pascalCase(answers.contractName),
        }),
      "Processing templates"
    );

    await spinner.runCommand(
      () => execa.command("git init", { cwd: projectPath }),
      "Initializing git"
    );

    let nodePath = "";
    if (flags["swanky-node"] || answers.useSwankyNode) {
      const taskResult = (await spinner.runCommand(
        () => downloadNode(projectPath, swankyNode, spinner),
        "Downloading Swanky node"
      )) as string;
      nodePath = taskResult;
    }

    await spinner.runCommand(() => installDeps(projectPath), "Installing dependencies");

    const config: SwankyConfig = {
      node: {
        localPath: nodePath,
        nodeAddress: "ws://127.0.0.1:9944",
        polkadotPalletVersions: swankyNode.polkadotPalletVersions,
        supportedInk: swankyNode.supportedInk,
      },
      accounts: [
        {
          alias: "alice",
          mnemonic: "//Alice",
        },
        {
          alias: "bob",
          mnemonic: "//Bob",
        },
      ],
    };
    await spinner.runCommand(
      () => writeJSON(path.resolve(projectPath, "swanky.config.json"), config, { spaces: 2 }),
      "Writing config"
    );

    this.log("🎉 😎 Swanky project successfully initialised! 😎 🎉");
  }
}
