import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import * as Generator from "yeoman-generator";

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
      contract: "cargo contract -V",
    };

    Object.entries(dependencyChecks).forEach(([dependency, command]) => {
      try {
        this.log(`Checking ${dependency}...`);
        execSync(command, { stdio: "ignore" });
      } catch {
        throw new Error(
          `${dependency} is not installed. Please refer to the guide: `
        );
      }
    });
  }

  async prompting(): Promise<void> {
    this.log("Cloning template repository...");

    execSync(
      `git clone https://github.com/AstarNetwork/swanky-template-ink.git "${resolve(
        this.name
      )}"`
    );
    rmSync(`${resolve(this.name, ".git")}`, { recursive: true });
  }
}
