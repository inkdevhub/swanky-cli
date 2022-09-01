import { execSync, exec } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  ensureDir,
  rmSync,
  copyFileSync,
  copy,
  rename,
} from "fs-extra";
import { Listr } from "listr2";
import decompress = require("decompress");
import download = require("download");
import { nodes } from "../../nodes";
import { checkCliDependencies } from "../../lib/tasks";
import execa = require("execa");
import handlebars from "handlebars";
import globby = require("globby");
import { paramCase, pascalCase, snakeCase } from "change-case";

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
  const contractTemplatesPath = path.resolve(
    templatesPath,
    "contracts",
    language
  );
  const fileList = readdirSync(contractTemplatesPath, {
    withFileTypes: true,
  });
  const contractTemplatesList = fileList
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      message: entry.name,
      name: entry.name,
    }));

  return { templatesPath, contractTemplatesPath, contractTemplatesList };
}

export class Generate extends Command {
  static description = "Generate a new smart contract environment";

  static flags = {
    "swanky-node": Flags.boolean(),
    template: Flags.string({
      options: getTemplates().contractTemplatesList.map(
        (template) => template.name
      ),
    }),
  };

  static args = [
    {
      name: "project_name",
      required: true,
      description: "directory name of new project",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);

    const tasks = new Listr<SwankyConfig>(
      [
        await checkCliDependencies([
          { dependencyName: "rust", versionCommand: "rustc --version" },
          { dependencyName: "cargo", versionCommand: "cargo -V" },
          {
            dependencyName: "cargo contract",
            versionCommand: "cargo contract -V",
          },
        ]),
        {
          title: "Cloning template",
          task: (ctx, task) =>
            task.newListr([
              {
                title: "Pick template",
                task: async (ctx, task): Promise<void> => {
                  const template = await task.prompt([
                    {
                      name: "contractTemplate",
                      message: "Which template should we use?",
                      type: "Select",
                      choices: getTemplates().contractTemplatesList,
                    },
                  ]);
                  ctx.contractTemplate = template;
                },
                skip: Boolean(ctx.contractTemplate),
              },
              {
                title: "Template name",
                task: async (ctx, task): Promise<void> => {
                  const contractName = await task.prompt({
                    message: "What should we name your contract?",
                    type: "Input",
                    initial: ctx.contractTemplate,
                  });
                  ctx.contractName = contractName;
                },
              },
              {
                title: "Author info",
                task: async (ctx, task): Promise<void> => {
                  const gitUserName = execa.commandSync(
                    "git config --get user.name"
                  ).stdout;
                  const gitUserEmail = execa.commandSync(
                    "git config --get user.email"
                  ).stdout;
                  const authorName = await task.prompt({
                    message: "What is your name?",
                    type: "Input",
                    initial: gitUserName,
                  });
                  const authorEmail = await task.prompt({
                    message: "What is your email?",
                    type: "Input",
                    initial: gitUserEmail,
                  });
                  ctx.author = { name: authorName, email: authorEmail };
                },
              },
              {
                title: "Copy core template files",
                task: async (ctx) => {
                  await ensureDir(ctx.project_name);
                  const templatesPath = getTemplates().templatesPath;
                  // TODO: use glob
                  const files = [
                    "gitignore",
                    "package.json.tpl",
                    "tsconfig.json",
                  ];
                  files.forEach((file) => {
                    copyFileSync(
                      path.resolve(templatesPath, file),
                      path.resolve(ctx.project_name, file)
                    );
                  });
                  rename(
                    path.resolve(ctx.project_name, "gitignore"),
                    path.resolve(ctx.project_name, ".gitignore")
                  );
                },
              },
              {
                title: "Copy contract template files",
                task: async (ctx) => {
                  const contractTemplatesPath =
                    getTemplates().contractTemplatesPath;
                  await copy(
                    path.resolve(
                      contractTemplatesPath,
                      ctx.contractTemplate as string
                    ),
                    path.resolve(
                      ctx.project_name,
                      "contracts",
                      ctx.contractName as string
                    )
                  );
                },
              },
              {
                title: "Apply user data to template",
                task: async (ctx) => {
                  if (!ctx.contractTemplate)
                    this.error("No template selected!");
                  const templateFiles = await globby(ctx.project_name, {
                    expandDirectories: { extensions: ["tpl"] },
                  });
                  templateFiles.forEach(async (tplFilePath) => {
                    const rawTemplate = readFileSync(tplFilePath, "utf8");
                    const template = handlebars.compile(rawTemplate);
                    const compiledFile = template({
                      project_name: paramCase(ctx.project_name),
                      author_name: ctx.author.name,
                      //TODO: get from package.json
                      swanky_version: "0.1.5",
                      contract_name_snake: snakeCase(
                        ctx.contractName as string
                      ),
                      contract_name_pascal: pascalCase(
                        ctx.contractName as string
                      ),
                    });
                    rmSync(tplFilePath);
                    writeFileSync(tplFilePath.split(".tpl")[0], compiledFile);
                  });
                },
              },
              {
                title: "Init git",
                task: async (ctx) => {
                  await execa.command("git init", {
                    cwd: path.resolve(ctx.project_name),
                  });
                },
              },
            ]),
        },
        {
          title: "Downloading node",
          task: (ctx, task) =>
            task.newListr([
              {
                title: "Pick node type",
                task: async (ctx, task): Promise<void> => {
                  const nodeType = await task.prompt([
                    {
                      name: "nodeType",
                      message: "What node type you want to develop on?",
                      type: "Select",
                      choices: [
                        { message: "Swanky node", name: "swanky" },
                        {
                          message: "Substrate contracts node",
                          name: "substrate-contracts-node",
                        },
                      ],
                    },
                  ]);

                  ctx.node.type = nodeType;
                },
                skip: Boolean(ctx.node.type),
              },
              {
                title: "Downloading",
                task: async (ctx, task): Promise<void> =>
                  new Promise<void>((resolve, reject) => {
                    const targetDir = path.resolve(ctx.project_name, "bin");
                    if (!existsSync(targetDir)) {
                      mkdirSync(targetDir);
                    }

                    const selectedNode = nodes[ctx.node.type as string];
                    ctx.node.url = selectedNode[ctx.platform];
                    ctx.node.supportedInk = selectedNode.supportedInk;
                    ctx.nodeTargetDir = targetDir;
                    ctx.nodeFileName = `${ctx.node.type}-node`;

                    const writer = createWriteStream(
                      path.resolve(ctx.nodeTargetDir as string, "node.zip")
                    );

                    const response = download(ctx.node.url as string);

                    response.on("response", (res) => {
                      const contentLength = Number.parseInt(
                        res.headers["content-length"] as unknown as string,
                        10
                      );
                      let progress = 0;
                      response.on("data", (chunk) => {
                        progress += chunk.length;
                        task.output = `Downloaded ${(
                          (progress / contentLength) *
                          100
                        ).toFixed(0)}%`;
                      });
                      response.on("end", () => {
                        resolve();
                      });
                      response.on("error", (error) => {
                        reject(
                          new Error(
                            `Error downloading node: , ${error.message}`
                          )
                        );
                      });
                    });
                    response.pipe(writer);
                  }),
              },
              {
                title: "Decompressing",
                task: async (ctx): Promise<void> => {
                  try {
                    const archiveFilePath = path.resolve(
                      ctx.nodeTargetDir as string,
                      "node.zip"
                    );

                    const decompressed = await decompress(
                      archiveFilePath,
                      ctx.nodeTargetDir as string
                    );
                    ctx.nodeFileName = decompressed[0].path;
                    execSync(`rm -f ${archiveFilePath}`);
                    execSync(
                      `chmod +x ${ctx.nodeTargetDir}/${ctx.nodeFileName}`
                    );
                  } catch {}
                },
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

            ctx.contracts = readdirSync(
              path.resolve(ctx.project_name, "contracts")
            ).map((dirName) => ({ name: dirName, address: "" }));

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
                  encoding: "utf-8",
                })
              );
              packageJson.dependencies = {
                [this.config.pjson.name]: this.config.pjson.version,
              };
              writeFileSync(pjsonPath, JSON.stringify(packageJson, null, 2), {
                encoding: "utf-8",
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

    await tasks.run({
      platform: this.config.platform,
      project_name: args.project_name,
      language: "ink",
      contractTemplate: flags.template,
      node: {
        type: flags.node,
      },
      accounts: [],
      author: { name: "", email: "" },
    });

    this.log("Successfully Initialized");
  }
}
