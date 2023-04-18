import { Args, Flags } from "@oclif/core";
import path = require("node:path");
import { ensureDir, writeJSON, stat, readdir, pathExists, readFile } from "fs-extra";
import execa = require("execa");
import { paramCase, pascalCase, snakeCase } from "change-case";
import inquirer = require("inquirer");
import { load } from "js-toml";
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
  swankyNode,
} from "@astar-network/swanky-core";
import { getAllTemplateNames, getTemplates } from "@astar-network/swanky-templates";
import { BaseCommand } from "../../lib/baseCommand";
import globby = require("globby");
const {
  DEFAULT_ASTAR_NETWORK_URL,
  DEFAULT_NETWORK_URL,
  DEFAULT_SHIBUYA_NETWORK_URL,
  DEFAULT_SHIDEN_NETWORK_URL,
} = consts;

type TaskFunction = (...args: any[]) => any;

interface Task {
  task: TaskFunction;
  args: any[];
  runningMessage: string;
  successMessage?: string;
  failMessage?: string;
  shouldExitOnError?: boolean;
  callback?: (param: string) => void;
}
export class Init extends BaseCommand {
  static description = "Generate a new smart contract environment";

  static flags = {
    "swanky-node": Flags.boolean(),
    template: Flags.string({
      options: getAllTemplateNames(),
      char: "t",
    }),
    language: Flags.string({ options: ["ask", "ink"], char: "l" }),
    convert: Flags.string({
      char: "c",
      description: "Converts an existing smart contract into a Swanky project",
    }),
  };

  static args = {
    projectName: Args.string({
      name: "projectName",
      required: true,
      description: "directory name of new project",
    }),
  };

  projectPath = "";

  configBuilder: Partial<SwankyConfig> = {
    node: {
      localPath: "",
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
    networks: {
      local: { url: DEFAULT_NETWORK_URL },
      astar: { url: DEFAULT_ASTAR_NETWORK_URL },
      shiden: { url: DEFAULT_SHIDEN_NETWORK_URL },
      shibuya: { url: DEFAULT_SHIBUYA_NETWORK_URL },
    },
  };

  taskQueue: Task[] = [];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);

    this.projectPath = path.resolve(args.projectName);

    // check if projectPath dir exists and is it empty
    try {
      const pathStat = await stat(this.projectPath);
      if (pathStat.isDirectory()) {
        const files = await readdir(this.projectPath);
        if (files.length > 0) throw new Error(`Directory ${args.projectName} is not empty!`);
      }
    } catch (error: unknown) {
      // ignore if it doesn't exist, it will be created
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;
    }

    if (flags.convert) {
      await this.convert(flags.convert);
      return;
    } else {
      await this.generate(args.projectName);
    }

    this.taskQueue.push({
      task: installDeps,
      args: [this.projectPath],
      runningMessage: "Installing dependencies",
      shouldExitOnError: false,
    });

    this.taskQueue.push({
      task: execa.command,
      args: ["git init", { cwd: this.projectPath }],
      runningMessage: "Initializing git",
    });

    if (!flags["swanky-node"]) {
      const { useSwankyNode } = await inquirer.prompt([
        choice("useSwankyNode", "Do you want to download Swanky node?"),
      ]);
      if (useSwankyNode) {
        this.taskQueue.push({
          task: downloadNode,
          args: [this.projectPath, swankyNode, this.spinner],
          runningMessage: "Downloading Swanky node",
          callback: (result) =>
            this.configBuilder.node ? (this.configBuilder.node.localPath = result) : null,
        });
      }
    }

    Object.keys(this.configBuilder.contracts as typeof this.swankyConfig.contracts).forEach(
      async (contractName) => {
        await ensureDir(path.resolve(this.projectPath, "artifacts", contractName));
        await ensureDir(path.resolve(this.projectPath, "test", contractName));
      }
    );

    this.taskQueue.push({
      task: () =>
        writeJSON(path.resolve(this.projectPath, "swanky.config.json"), this.configBuilder, {
          spaces: 2,
        }),
      args: [],
      runningMessage: "Writing config",
    });

    for (const {
      task,
      args,
      runningMessage,
      successMessage,
      failMessage,
      shouldExitOnError,
      callback,
    } of this.taskQueue) {
      const result = await this.spinner.runCommand(
        () => task(...args),
        runningMessage,
        successMessage,
        failMessage,
        shouldExitOnError
      );
      if (result && callback) {
        callback(result as string);
      }
    }
    this.log("🎉 😎 Swanky project successfully initialised! 😎 🎉");
  }

  async generate(projectName: string) {
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

    const answers = await inquirer.prompt(questions);

    this.taskQueue.push({
      task: checkCliDependencies,
      args: [this.spinner],
      runningMessage: "Checking dependencies",
    });

    this.taskQueue.push({
      task: copyTemplateFiles,
      args: [
        templates.templatesPath,
        path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
        answers.contractName,
        this.projectPath,
      ],
      runningMessage: "Copying template files",
    });

    this.taskQueue.push({
      task: processTemplates,
      args: [
        this.projectPath,
        {
          project_name: paramCase(projectName),
          author_name: answers.authorName,
          author_email: answers.email,
          swanky_version: this.config.pjson.version,
          contract_name: answers.contractName,
          contract_name_snake: snakeCase(answers.contractName),
          contract_name_pascal: pascalCase(answers.contractName),
          contract_language: contractLanguage,
        },
      ],
      runningMessage: "Processing templates",
    });

    this.configBuilder.contracts = {
      [answers.contractName as string]: {
        name: answers.contractName as string,
        deployments: [],
        language: contractLanguage,
      },
    };
  }

  async convert(pathToExistingProject: string) {
    try {
      const pathStat = await stat(pathToExistingProject);
      if (pathStat.isDirectory()) {
        const files = await readdir(pathToExistingProject);
        if (files.length < 1)
          throw new Error(`Target project directory [${pathToExistingProject}] is empty!`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("ENOENT"))
        throw new Error(`Target project directory [${pathToExistingProject}] not found!`);
      throw error;
    }

    // 2. Look for cargo.toml with "workspace" field in the root
    const rootTomlPath = path.resolve(pathToExistingProject, "Cargo.toml");
    if (await pathExists(rootTomlPath)) {
      const rootTomlContracts = await getRootCargoToml(rootTomlPath);
      // 3a. Workspace found - use the glob in the "members field" to select directories to copy over
      console.log(rootTomlContracts);
    } else {
      // WILL NOT IMPLEMENT - too many variables 3b. workspace not found, use regex to find dir/dirs*/[cargo.toml, lib.rs]
      // 3c. if not found, ask user for a path where contracts are -> [Ctrl+C to cancel]
      // and optionally
    }

    // 4. make a list (checkbox) for user to confirm contracts to copy
    // 5. add directories from Cargo.toml/exclude path to copy list
    // 6. look for test/tests directory and add it to the list
    // 7. copy all the selected directories/files and update the swanky.config
    // 8. copy cargo.toml from the root, modify path if needed ( "uniswap-v2/contracts/**" -> "contracts/**")
    // 9. keep log of all the steps and write it to file
    // 10. Copy rust.toolchain and .rustfmt.toml if exists
  }
}

// async function copyWorkspaceContracts() {}

async function getRootCargoToml(rootTomlPath: string) {
  const fileData = await readFile(rootTomlPath, "utf-8");
  const toml: { workspace?: { members?: string[]; exclude?: string[] } } = load(fileData);

  if (!toml.workspace?.members) throw new Error(`No "workspace.members" field in Cargo.toml`);

  const getGlobPaths = async (globList: string[]) =>
    globby(
      globList.map((glob) => path.resolve(path.dirname(rootTomlPath), glob)),
      {
        absolute: true,
        onlyDirectories: true,
        deep: 1,
        objectMode: true,
      }
    );

  const detectedPaths = {
    contracts: await getGlobPaths(toml.workspace.members),
    additionalPaths: toml.workspace.exclude ? await getGlobPaths(toml.workspace.exclude) : [],
  };
  console.log(toml);
  return detectedPaths;
}
