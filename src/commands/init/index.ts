import { execSync, exec } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import {
  rmSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { Listr } from "listr2";
import decompress = require("decompress");
import download = require("download");
import { nodes } from "../../nodes";
import { writeFileSync } from "node:fs";
import { checkCliDependencies } from "../../lib/tasks";

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
  accounts: { alias: string; mnemonic: string }[];
}

const contractTypes = [
  { message: "Blank", name: "master" },
  { message: "Flipper", name: "flipper" },
  { message: "PSP22", name: "psp22" },
];
export class Generate extends Command {
  static description = "Generate a new smart contract environment";

  static flags = {
    template: Flags.string({
      options: contractTypes.map((type) => type.message.toLowerCase()),
    }),
    "swanky-node": Flags.boolean(),
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
                      choices: [
                        { message: "Blank", name: "master" },
                        { message: "Flipper", name: "flipper" },
                        { message: "PSP22", name: "psp22" },
                        { message: "Dual contract", name: "dual-contract" },
                      ],
                    },
                  ]);
                  ctx.contractTemplate = template;
                },
                skip: Boolean(ctx.contractTemplate),
              },
              {
                title: "Template name",
                task: (ctx): void => {
                  execSync(
                    `git clone -b ${
                      ctx.contractTemplate
                    } --single-branch https://github.com/AstarNetwork/swanky-template-ink.git "${path.resolve(
                      ctx.project_name
                    )}"`,
                    { stdio: "ignore" }
                  );
                },
              },
              {
                title: "Author name",
                task: (ctx): void => {
                  rmSync(`${path.resolve(ctx.project_name, ".git")}`, {
                    recursive: true,
                  });
                  execSync(`rm -f ${ctx.project_name}/**/.gitkeep`, {
                    stdio: "ignore",
                  });
                  execSync(`git init`, { cwd: ctx.project_name });
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
      language: flags.language,
      contractTemplate: flags.template,
      node: {
        type: flags.node,
      },
      accounts: [],
    });

    this.log("Successfully Initialized");
  }
}
