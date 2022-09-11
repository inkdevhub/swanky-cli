import { execSync, exec } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { createWriteStream, readFileSync, readdirSync, writeFileSync, readJSON } from "fs-extra";
import { Listr } from "listr2";
import decompress = require("decompress");
import download = require("download");
import { swankyNode } from "../../lib/nodeInfo";
import {
  checkCliDependencies,
  copyTemplateFiles,
  downloadNode,
  processTemplates,
} from "../../lib/tasks";
import execa = require("execa");
import { paramCase, pascalCase, snakeCase } from "change-case";
import inquirer = require("inquirer");
import { choice, email, name, pickTemplate } from "../../lib/prompts";

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

    const answers = await inquirer.prompt([
      pickTemplate(templates.contractTemplatesList),
      name("contract", (ans) => ans.contractTemplate, "What should we name your contract?"),
      name(
        "author",
        () => execa.commandSync("git config --get user.name").stdout,
        "What is your name?"
      ),
      email(),
      choice("useSwankyNode", "Do you want to download Swanky node?"),
    ]);

    await checkCliDependencies();

    await copyTemplateFiles(
      templates.templatesPath,
      path.resolve(templates.contractTemplatesPath, answers.contractTemplate),
      answers.contractName,
      projectPath
    );

    await processTemplates(projectPath, {
      project_name: paramCase(args.projectName),
      author_name: answers.authorName,
      author_email: answers.email,
      swanky_version: this.config.pjson.version,
      contract_name_snake: snakeCase(answers.contractName),
      contract_name_pascal: pascalCase(answers.contractName),
    });

    await execa.command("git init", { cwd: projectPath });

    if (answers.useSwankyNode) {
      await downloadNode(projectPath, swankyNode);
    }
    const tasks = new Listr<SwankyConfig>(
      [
        {
          title: "Downloading node",
          task: (ctx, task) =>
            task.newListr([
              {
                title: "Decompressing",
                task: async (ctx): Promise<void> => {
                  try {
                    const archiveFilePath = path.resolve(ctx.nodeTargetDir as string, "node.zip");

                    const decompressed = await decompress(
                      archiveFilePath,
                      ctx.nodeTargetDir as string
                    );
                    ctx.nodeFileName = decompressed[0].path;
                    execSync(`rm -f ${archiveFilePath}`);
                    execSync(`chmod +x ${ctx.nodeTargetDir}/${ctx.nodeFileName}`);
                  } catch {
                    console.error("Error decompressing");
                  }
                },
                skip: !answers.useSwankyNode,
              },
            ]),
        },
        {
          title: "Storing config",
          task: (ctx) => {
            ctx.node.localPath = path.resolve(
              ctx.nodeTargetDir as string,
              ctx.nodeFileName as string
            );
            ctx.node.nodeAddress = "ws://127.0.0.1:9944";
            delete ctx.nodeFileName;
            delete ctx.nodeTargetDir;

            ctx.contracts = readdirSync(path.resolve(ctx.project_name, "contracts")).map(
              (dirName) => ({
                name: dirName,
                address: "",
              })
            );

            ctx.accounts = [
              {
                alias: "alice",
                mnemonic: "//Alice",
              },
              {
                alias: "bob",
                mnemonic: "//Bob",
              },
            ];

            writeFileSync(
              path.resolve(`${ctx.project_name}`, "swanky.config.json"),
              JSON.stringify(ctx, null, 2)
            );
          },
        },
        {
          title: "Installing",
          task: async (ctx, task): Promise<void> =>
            new Promise<void>((resolve, reject) => {
              const pjsonPath = path.resolve(ctx.project_name, "package.json");
              const packageJson = JSON.parse(
                readFileSync(pjsonPath, {
                  encoding: "utf8",
                })
              );
              packageJson.dependencies = {
                [this.config.pjson.name]: this.config.pjson.version,
              };
              writeFileSync(pjsonPath, JSON.stringify(packageJson, null, 2), {
                encoding: "utf8",
              });
              let installCommand = "npm install";
              try {
                execSync("yarn --version");
                installCommand = "yarn install";
                task.output = "Yarn detected..";
              } catch {
                task.output = "No Yarn detected, using NPM..";
              }

              task.output = `Running ${installCommand}..`;
              exec(installCommand, { cwd: ctx.project_name }, (error) => {
                if (error) {
                  reject(error);
                }

                resolve();
              });
            }),
        },
      ],
      {
        rendererOptions: { collapse: true },
      }
    );

    // await tasks.run({
    //   platform: this.config.platform,
    //   project_name: args.project_name,
    //   language: "ink",
    //   contractTemplate: flags.template,
    //   node: {
    //     type: flags["swanky-node"] ? "swanky" : undefined,
    //   },
    //   accounts: [],
    //   author: { name: "", email: "" },
    // });

    this.log("Successfully Initialized");
  }
}
