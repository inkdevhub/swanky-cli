import { execSync } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import * as path from "node:path";
import {
  rmSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { Listr } from "listr2";
import * as decompress from "decompress";
import * as download from "download";
import { nodes } from "../../nodes";
import { writeFileSync } from "node:fs";

interface Ctx {
  platform: string;
  contractTemplate?: string;
  name: string;
  nodeType?: string;
  nodeUrl?: string;
  nodeTargetDir?: string;
  nodeFileName?: string;
  nodePath?: string;
  contracts?: string[];
}
export class Generate extends Command {
  static description = "Generate a new smart contract environment";

  static flags = {
    language: Flags.string({
      char: "l",
      default: "ink",
      options: ["ink", "ask"],
    }),
  };

  static args = [
    {
      name: "name",
      required: true,
      description: "directory name of new project",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);

    if (flags.language !== "ink") {
      this.error(`Sorry, ${flags.language} is not supported yet`, { exit: 0 });
    }

    const tasks = new Listr<Ctx>(
      [
        {
          title: "Checking dependencies",
          task: (ctx, task) => {
            const tasks = Object.entries({
              rust: "rustc --version",
              cargo: "cargo -V",
              "cargo contract": "cargo contract -V",
            }).map(([dependency, command]) => ({
              title: `Checking ${dependency}`,
              task: () => {
                try {
                  execSync(command, { stdio: "ignore" });
                } catch {
                  throw new Error(
                    `"${dependency}" is not installed. Please follow the guide: https://docs.substrate.io/tutorials/v3/ink-workshop/pt1/#update-your-rust-environment`
                  );
                }
              },
            }));
            return task.newListr(tasks, { concurrent: true });
          },
        },
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
                        { message: "Dual contract", name: "dual-contract" },
                      ],
                    },
                  ]);
                  ctx.contractTemplate = template;
                },
              },
              {
                title: "Cloning template repo",
                task: (ctx): void => {
                  execSync(
                    `git clone -b ${
                      ctx.contractTemplate
                    } --single-branch https://github.com/AstarNetwork/swanky-template-ink.git "${path.resolve(
                      ctx.name
                    )}"`,
                    { stdio: "ignore" }
                  );
                },
              },
              {
                title: "Clean up",
                task: (ctx): void => {
                  rmSync(`${path.resolve(ctx.name, ".git")}`, {
                    recursive: true,
                  });
                  execSync(`rm -f ${ctx.name}/**/.gitkeep`, {
                    stdio: "ignore",
                  });
                  execSync(`git init`, { cwd: ctx.name });
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
                          message: "Parity contracts node",
                          name: "parity-contracts",
                        },
                      ],
                    },
                  ]);
                  const targetDir = path.resolve(ctx.name, "bin");
                  if (!existsSync(targetDir)) {
                    mkdirSync(targetDir);
                  }

                  ctx.nodeType = nodeType;
                  ctx.nodeUrl = nodes[nodeType][ctx.platform];
                  ctx.nodeTargetDir = targetDir;
                  ctx.nodeFileName = `${nodeType}-node`;
                },
              },
              {
                title: "Downloading",
                task: async (ctx, task): Promise<void> =>
                  new Promise<void>((resolve, reject) => {
                    const writer = createWriteStream(
                      path.resolve(ctx.nodeTargetDir as string, "node.zip")
                    );

                    const response = download(ctx.nodeUrl as string);

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
            ctx.nodePath = path.resolve(
              ctx.nodeTargetDir as string,
              ctx.nodeFileName as string
            );
            delete ctx.nodeFileName;
            delete ctx.nodeTargetDir;

            ctx.contracts = readdirSync(path.resolve(ctx.name, "contracts"));

            writeFileSync(
              path.resolve(`${ctx.name}`, "swanky.config.json"),
              JSON.stringify(ctx, null, 2)
            );
          },
        },
        {
          title: "Npm install",
          task: (ctx, task) => {
            const pjsonPath = path.resolve(ctx.name, "package.json");
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

            execSync(installCommand, { cwd: ctx.name });
          },
        },
      ],
      {
        rendererOptions: { collapse: true },
      }
    );

    try {
      await tasks.run({ platform: this.config.platform, name: args.name });
    } catch {}
  }

  async catch(_error: Record<string, any>): Promise<any> {
    console.error(_error);
  }
}
