import { execSync } from "node:child_process";
import * as path from "node:path";
import { rmSync, createWriteStream, existsSync, mkdirSync } from "node:fs";

import * as Generator from "yeoman-generator";
import * as download from "download";
import * as ProgressBar from "progress";

const debug = require("debug")("generator-ink");

let hasYarn = false;
try {
  execSync("yarn -v", { stdio: "ignore" });
  hasYarn = true;
} catch {
  debug("No yarn detected..");
}

export default class Ink extends Generator {
  options: {
    defaults?: boolean;
    yarn: boolean;
  };

  name: string;

  constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.name = opts.name;
    this.options = {
      defaults: opts.defaults,
      yarn: hasYarn,
    };
  }

  async initializing(): Promise<void> {
    this.log("Checking dependencies...");

    const dependencyChecks = {
      rust: "rustc --version",
      cargo: "cargo -V",
      "cargo contract": "cargo contract -V",
    };

    Object.entries(dependencyChecks).forEach(([dependency, command]) => {
      try {
        execSync(command, { stdio: "ignore" });
        this.log.ok(`Checking ${dependency}`);
      } catch {
        // TODO: put astar docs link here
        this.log.error(
          `"${dependency}" is not installed. Please follow the guide:
          https://docs.substrate.io/tutorials/v3/ink-workshop/pt1/#update-your-rust-environment`
        );
        process.exit(1);
      }
    });
  }

  async prompting(): Promise<void> {
    const { contractTemplate } = await this.prompt({
      name: "contractTemplate",
      type: "list",
      message: "Which template should we use?",
      choices: [
        { name: "Blank", value: "master" },
        { name: "Flipper", value: "flipper" },
        { name: "Dual contract", value: "dual-contract" },
      ],
    });

    execSync(
      `git clone -b ${contractTemplate} --single-branch https://github.com/AstarNetwork/swanky-template-ink.git "${path.resolve(
        this.name
      )}"`,
      { stdio: "ignore" }
    );
    this.log.ok("Cloning template repository...");

    rmSync(`${path.resolve(this.name, ".git")}`, { recursive: true });
  }

  async writing(): Promise<void> {
    const binDir = path.resolve(this.name, "bin");
    if (!existsSync(binDir)) {
      mkdirSync(binDir);
    }

    const url =
      "https://github.com/AstarNetwork/swanky-node/releases/download/v0.1.0/swanky-node-macOS-latest-x86_64.zip";
    await this._downloadNode(url, binDir);
  }

  async _downloadNode(nodeUrl: string, targetDir: string): Promise<void> {
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
          this.log.ok("Node downloaded");
          resolve();
        });
        response.on("error", (error) => {
          reject(error);
        });
      });
      response.pipe(writer);
    });
  }
}
