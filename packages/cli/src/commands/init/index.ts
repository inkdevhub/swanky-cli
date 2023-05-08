import { Args, Flags } from "@oclif/core";
import path = require("node:path");
import {
  ensureDir,
  writeJSON,
  stat,
  readdir,
  pathExists,
  readFile,
  Dirent,
  copy,
  outputFile,
  readJSON,
  writeJson,
  remove,
} from "fs-extra";
import execa = require("execa");
import { paramCase, pascalCase, snakeCase } from "change-case";
import inquirer = require("inquirer");
import TOML from "@iarna/toml";
import { choice, email, name, pickLanguage, pickTemplate } from "../../lib/prompts";
import {
  checkCliDependencies,
  copyCommonTemplateFiles,
  copyContractTemplateFiles,
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
import { merge } from "lodash";
import inquirerFuzzyPath from "inquirer-fuzzy-path";

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

type PathEntry = {
  dirent: Dirent;
  name: string;
  path: string;
};

type CopyCandidates = {
  contracts: PathEntry[];
  crates: PathEntry[];
  tests?: PathEntry[];
};

inquirer.registerPrompt("fuzzypath", inquirerFuzzyPath);

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
    contracts: {},
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

    const templates = getTemplates("ink");
    this.taskQueue.push({
      task: copyCommonTemplateFiles,
      args: [templates.templatesPath, this.projectPath],
      runningMessage: "Copying common template files",
    });

    this.taskQueue.push({
      task: processTemplates,
      args: [
        this.projectPath,
        {
          project_name: paramCase(args.projectName),
        },
      ],
      runningMessage: "Processing common templates",
    });

    if (flags.convert) {
      await this.convert(flags.convert);
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
      task: copyContractTemplateFiles,
      args: [
        path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
        answers.contractName,
        this.projectPath,
      ],
      runningMessage: "Copying contract template files",
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
      runningMessage: "Processing contract template",
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

    let rootTomlPaths = await getRootCargoTomlPaths(pathToExistingProject);

    if (rootTomlPaths) {
      console.log("Workspaces detected in root Cargo.toml file.");
      const { shouldKeepRootToml } = await inquirer.prompt([
        choice("shouldKeepRootToml", "Do you want to use it to automatically copy contracts?"),
      ]);
      rootTomlPaths = shouldKeepRootToml ? rootTomlPaths : null;
    }

    const candidatesList: CopyCandidates = rootTomlPaths
      ? await getCopyCandidatesList(pathToExistingProject, rootTomlPaths)
      : await getCopyCandidatesList(
          pathToExistingProject,
          await getManualPaths(pathToExistingProject)
        );

    const testDir = await detectTests(pathToExistingProject);

    candidatesList.tests = (await pathExists(testDir))
      ? await getDirsAndFiles(pathToExistingProject, [testDir])
      : [];

    const confirmedCopyList = await confirmCopyList(candidatesList);

    this.taskQueue.push({
      task: copyWorkspaceContracts,
      args: [confirmedCopyList, this.projectPath],
      runningMessage: "Copying existing project files",
      successMessage: "Project files successfully copied",
      failMessage: "Failed to copy project files",
      shouldExitOnError: true,
      callback: (result) => {
        console.log(result);
      },
    });

    if (!this.configBuilder.contracts) this.configBuilder.contracts = {};

    for (const contract of confirmedCopyList.contracts) {
      this.configBuilder.contracts[contract.name] = {
        name: contract.name,
        deployments: [],
        language: "ink",
      };
    }

    let rootToml = await readRootCargoToml(pathToExistingProject);

    if (!rootToml) rootToml = { workspace: {} };

    rootToml.workspace.members = ["contracts/*"];
    rootToml.workspace.exclude = ["crates/*"];

    this.taskQueue.push({
      task: async (tomlObject, projectPath) => {
        const tomlString = TOML.stringify(tomlObject);
        const rootTomlPath = path.resolve(projectPath, "Cargo.toml");
        await outputFile(rootTomlPath, tomlString);
      },
      args: [rootToml, this.projectPath],
      runningMessage: "Writing Cargo.toml",
    });

    this.taskQueue.push({
      task: async (pathToExistingProject, projectPath) => {
        const fileList = ["rust-toolchain.toml", ".rustfmt.toml"];
        for (const fileName of fileList) {
          const filePath = await path.resolve(pathToExistingProject, fileName);
          if (await pathExists(filePath)) {
            await copy(filePath, path.resolve(projectPath, fileName));
          }
        }
      },
      args: [pathToExistingProject, this.projectPath],
      runningMessage: "Copying workspace files",
    });

    const existingPJsonPath = path.resolve(pathToExistingProject, "package.json");
    if (await pathExists(existingPJsonPath)) {
      this.taskQueue.push({
        task: async (pJsonPath, projectPath) => {
          const existingPJson = await readJSON(pJsonPath);
          const templatePJsonPath = path.resolve(projectPath, "package.json");
          const templatePJson = await readJSON(templatePJsonPath);
          const mergedJson = merge(templatePJson, existingPJson);
          await remove(templatePJsonPath);
          await writeJson(templatePJsonPath, mergedJson, { spaces: 2 });
        },
        args: [existingPJsonPath, this.projectPath],
        runningMessage: "Merging package.json",
      });
    }
  }
}

async function copyWorkspaceContracts(copyList: CopyCandidates, projectPath: string) {
  const copyPaths = async (group: "contracts" | "tests" | "crates") => {
    const destDir = path.resolve(projectPath, group);
    await ensureDir(destDir);

    for (const entry of copyList[group] as PathEntry[]) {
      const basename = path.basename(entry.path);
      const destPath = path.join(destDir, basename);
      await copy(entry.path, destPath);
    }
  };

  await copyPaths("contracts");
  await copyPaths("tests");
  await copyPaths("crates");
}

async function confirmCopyList(candidatesList: CopyCandidates) {
  if (!candidatesList.tests) candidatesList.tests = [];

  const { confirmedCopyList } = await inquirer.prompt({
    message: "Please review the list of files and directories to copy:",
    name: "confirmedCopyList",
    type: "checkbox",
    choices: [
      new inquirer.Separator("=====Contracts====="),
      ...candidatesList.contracts.map((contract) => ({
        name: `${contract.name}${contract.dirent.isDirectory() ? "/" : ""}`,
        value: { ...contract, group: "contracts" },
        checked: true,
      })),
      new inquirer.Separator("=====Crates====="),
      ...candidatesList.crates.map((path) => ({
        name: `${path.name}${path.dirent.isDirectory() ? "/" : ""}`,
        value: { ...path, group: "crates" },
        checked: true,
      })),
      new inquirer.Separator("=====Tests====="),
      ...candidatesList.tests.map((test) => ({
        name: `${test.name}${test.dirent.isDirectory() ? "/" : ""}`,
        value: { ...test, group: "tests" },
        checked: true,
      })),
    ],
  });

  const resultingList: CopyCandidates = { contracts: [], crates: [], tests: [] };
  confirmedCopyList.forEach(
    (
      item: PathEntry & {
        group: "contracts" | "crates" | "tests";
      }
    ) => {
      resultingList[item.group]?.push(item);
    }
  );
  return resultingList;
}

async function detectTests(pathToExistingProject: string) {
  const testDirNames = ["test", "tests", "spec", "specs"];

  let testDir = undefined;

  for (const testDirName of testDirNames) {
    const testDirCandidate = path.resolve(pathToExistingProject, testDirName);
    const testDirExists = await pathExists(testDirCandidate);
    if (testDirExists) {
      testDir = testDirCandidate;
      break;
    }
  }

  const { shouldOverwriteTestDir, manualTestDir } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldOverwriteTestDir",
      message: `${
        testDir
          ? `Detected test directory [${path.basename(
              testDir
            )}] will be copied. Do you want to override and`
          : "No test directory detected, do you want to"
      } specify it manually?`,
      default: false,
    },
    {
      when: (answers) => answers.shouldOverwriteTestDir,
      type: "fuzzypath",
      name: "manualTestDir",
      itemType: "directory",
      rootPath: pathToExistingProject,
      message: "Please enter the path to the contracts directory: ",
      excludePath: (nodePath: string) => nodePath.startsWith("node_modules"),
    },
  ]);
  if (shouldOverwriteTestDir) {
    return manualTestDir;
  }
  return testDir;
}

async function getRootCargoTomlPaths(pathToProject: string) {
  const toml = await readRootCargoToml(pathToProject);

  if (!toml?.workspace.members) return null;

  return {
    contractsDirectories: toml.workspace.members,
    cratesDirectories: toml.workspace.exclude,
  };
}

async function readRootCargoToml(pathToProject: string) {
  const rootTomlPath = path.resolve(pathToProject, "Cargo.toml");
  if (!(await pathExists(rootTomlPath))) return null;
  const fileData = await readFile(rootTomlPath, "utf-8");
  const toml: any = TOML.parse(fileData);

  if (!toml.workspace) toml.workspace = {};

  return toml;
}

async function getManualPaths(pathToProject: string) {
  console.log("No Cargo.toml found in the provided directory, or no workspace field within it.");
  const { contractsDirectory, cratesDirectory, useCrateDirectory } = await inquirer.prompt([
    {
      type: "fuzzypath",
      name: "contractsDirectory",
      itemType: "directory",
      rootPath: pathToProject,
      message: "Please enter the path to the contracts directory: ",
      excludePath: (nodePath: string) => nodePath.startsWith("node_modules"),
    },
    {
      type: "confirm",
      name: "useCrateDirectory",
      message: "Do you have an extra the crate directory?",
      default: false,
    },
    {
      when: (answers) => answers.useCrateDirectory,
      type: "fuzzypath",
      name: "cratesDirectory",
      itemType: "directory",
      rootPath: pathToProject,
      message: "Please enter the path to the contracts directory: ",
      excludePath: (nodePath: string) => nodePath.startsWith("node_modules"),
    },
  ]);

  return {
    contractsDirectories: [contractsDirectory],
    cratesDirectories: useCrateDirectory ? [cratesDirectory] : [],
  };
}

async function getCopyCandidatesList(
  projectPath: string,
  pathsToCopy: {
    contractsDirectories: string[];
    cratesDirectories?: string[];
  }
) {
  const detectedPaths = {
    contracts: await getDirsAndFiles(projectPath, pathsToCopy.contractsDirectories),
    crates:
      pathsToCopy.cratesDirectories && pathsToCopy.cratesDirectories.length > 0
        ? await getDirsAndFiles(projectPath, pathsToCopy.cratesDirectories)
        : [],
  };

  return detectedPaths;
}

async function getGlobPaths(projectPath: string, globList: string[], isDirOnly: boolean) {
  return globby(
    globList.map((glob) => path.resolve(projectPath, glob)),
    {
      absolute: true,
      onlyDirectories: isDirOnly,
      deep: 1,
      objectMode: true,
    }
  );
}

async function getDirsAndFiles(projectPath: string, globList: string[]) {
  return [
    ...(await getGlobPaths(projectPath, globList, false)),
    ...(await getGlobPaths(projectPath, globList, true)),
  ];
}
