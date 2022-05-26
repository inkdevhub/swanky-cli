import { execSync } from "node:child_process";
import { Command, Flags } from "@oclif/core";
import * as path from "node:path";
import { rmSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import * as inquirer from "inquirer";
import * as Listr from "listr";
// @ts-ignore
import * as listrUpdateRenderer from "listr-update-renderer";
import * as decompress from "decompress";
import * as download from "download";
import * as ProgressBar from "progress";
import { nodes } from "../../nodes";
export class Generate extends Command {
  static description = "Generate a new Ink based smart contract";

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

    try {
      await checkDependencies.run();
      const { contractTemplate } = await inquirer.prompt({
        name: "contractTemplate",
        type: "list",
        message: "Which template should we use?",
        choices: [
          { name: "Blank", value: "master" },
          { name: "Flipper", value: "flipper" },
          { name: "Dual contract", value: "dual-contract" },
        ],
      });
      await await cloneTemplateRepo.run({ contractTemplate, name: args.name });
      const binDir = path.resolve(args.name, "bin");
      if (!existsSync(binDir)) {
        mkdirSync(binDir);
      }

      await _downloadNode(nodes.swanky[this.config.platform], binDir);
    } catch {}
  }

  async catch(_error: Record<string, any>): Promise<any> {}
}

const checkDependencies = new Listr(
  [
    {
      title: "Check dependencies",
      task: () => {
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
        return new Listr(tasks);
      },
    },
  ],
  {
    renderer: listrUpdateRenderer,
    // @ts-ignore
    collapse: false,
  }
);

const cloneTemplateRepo = new Listr([
  {
    title: "Clone template repo",
    task: (ctx) => {
      execSync(
        `git clone -b ${
          ctx.contractTemplate
        } --single-branch https://github.com/AstarNetwork/swanky-template-ink.git "${path.resolve(
          ctx.name
        )}"`,
        { stdio: "ignore" }
      );
      rmSync(`${path.resolve(ctx.name, ".git")}`, { recursive: true });
    },
  },
]);

const downloadNode = new Listr([
  {
    title: "Download node",
    task: () => {},
  },
]);

async function _downloadNode(
  nodeUrl: string,
  targetDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(path.resolve(targetDir, "node.zip"));

    const response = download(nodeUrl, { extract: true });
    response.on("response", (res) => {
      const contentLength = Number.parseInt(
        res.headers["content-length"] as unknown as string,
        10
      );
      const bar = new ProgressBar(
        "Downloading node: [:bar] :rate/bps :percent :etas",
        {
          complete: "=",
          incomplete: " ",
          width: 20,
          total: contentLength,
        }
      );
      response.on("data", (chunk) => {
        bar.tick(chunk.length);
      });
      response.on("end", () => {
        console.log("Node downloaded");
        resolve();
      });
      response.on("error", (error) => {
        reject(error);
      });
    });
    response.pipe(writer);
  });
}

async function _decompressNode(
  pathToFile: string,
  fileName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const filePath = path.resolve(pathToFile, fileName);
      const decompressed = decompress(filePath, pathToFile);
      console.log(decompressed);
      execSync(`rm -f ${filePath}`);
      resolve();
    } catch {
      reject(new Error("Unable to extract node"));
    }
  });
}
