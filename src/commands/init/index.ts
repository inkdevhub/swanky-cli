import { execSync } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import * as path from "node:path";
import { rmSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { Listr } from "listr2";
import * as decompress from "decompress";
import * as download from "download";
import { nodes } from "../../nodes";

interface Ctx {
  platform: string;
  contractTemplate?: string;
  name: string;
  nodeType?: string;
  nodeUrl?: string;
  nodeTargetDir?: string;
  nodeFileName?: string;
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
          title: "Download node",
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
                      choices: [{ message: "Swanky node", name: "swanky" }],
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
                title: "Downloading node",
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
                title: "Decompressing node",
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
