import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { ensureDir, writeJSON } from "fs-extra";
import execa = require("execa");
import { paramCase, pascalCase, snakeCase } from "change-case";
import inquirer = require("inquirer");
import { choice, email, name, pickLanguage, pickTemplate } from "../../lib/prompts";
import {
  checkCliDependencies,
  copyTemplateFiles,
  downloadNode,
  installDeps,
  ChainAccount,
  processTemplates,
  SwankyConfig,
  consts,
  Spinner,
  swankyNode,
} from "@astar-network/swanky-core";
import { getAllTemplateNames, getTemplates } from "@astar-network/swanky-templates";
const {
  DEFAULT_ASTAR_NETWORK_URL,
  DEFAULT_NETWORK_URL,
  DEFAULT_SHIBUYA_NETWORK_URL,
  DEFAULT_SHIDEN_NETWORK_URL,
} = consts;
export class Init extends Command {
  static description = "Generate a new smart contract environment";

  static flags = {
    "swanky-node": Flags.boolean(),
    template: Flags.string({
      options: getAllTemplateNames(),
      char: "t",
    }),
    language: Flags.string({ options: ["ask", "ink"], char: "l" }),
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

    const { contractLanguage } = await inquirer.prompt([pickLanguage()]);

    const templates = getTemplates(contractLanguage);

    const questions = [
      pickTemplate(templates.contractTemplatesQueryPairs),
      name("contract", (ans) => ans.contractTemplate, "What should we name your initial contract?"),
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
          contract_name: answers.contractName,
          contract_name_snake: snakeCase(answers.contractName),
          contract_name_pascal: pascalCase(answers.contractName),
          contract_language: contractLanguage,
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
      nodePath = path.relative(projectPath, taskResult);
    }

    await ensureDir(path.resolve(projectPath, "artifacts", answers.contractName));
    await ensureDir(path.resolve(projectPath, "test", answers.contractName));

    await spinner.runCommand(
      () => installDeps(projectPath),
      "Installing dependencies",
      "",
      "",
      false
    );

    const config: SwankyConfig = {
      node: {
        localPath: nodePath,
        polkadotPalletVersions: swankyNode.polkadotPalletVersions,
        supportedInk: swankyNode.supportedInk,
      },
      accounts: [
        {
          alias: "alice",
          mnemonic: "//Alice",
          isDev: true,
          address: new ChainAccount("//Alice").pair.address,
        },
        {
          alias: "bob",
          mnemonic: "//Bob",
          isDev: true,
          address: new ChainAccount("//Bob").pair.address,
        },
      ],
      contracts: {
        [answers.contractName as string]: {
          name: answers.contractName as string,
          deployments: [],
          language: contractLanguage,
        },
      },
      networks: {
        local: { url: DEFAULT_NETWORK_URL },
        astar: { url: DEFAULT_ASTAR_NETWORK_URL },
        shiden: { url: DEFAULT_SHIDEN_NETWORK_URL },
        shibuya: { url: DEFAULT_SHIBUYA_NETWORK_URL },
      },
    };
    await spinner.runCommand(
      () => writeJSON(path.resolve(projectPath, "swanky.config.json"), config, { spaces: 2 }),
      "Writing config"
    );

    this.log("🎉 😎 Swanky project successfully initialised! 😎 🎉");
  }
}
