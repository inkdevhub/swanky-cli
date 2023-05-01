import { BaseCommand } from "../../lib/baseCommand";
import { Args } from "@oclif/core";
import { ensureSwankyProject } from "@astar-network/swanky-core";
import { existsSync } from "fs-extra";
import { fork } from "child_process";
import path = require("node:path");

export class RunCommand extends BaseCommand<typeof RunCommand> {
  static description = "Run a user-defined scripts";

  static args = {
    scriptName: Args.string({
      name: "scriptName",
      required: true,
      description: "Name of the script to run",
    }),
  };

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { args } = await this.parse(RunCommand);

    let scriptName = args.scriptName;
    if (!scriptName.endsWith(".ts")) {
      scriptName += ".ts";
    }

    const scriptPath = path.resolve("scripts", scriptName);
    if (!existsSync(scriptPath)) {
      throw new Error(`Script ${args.scriptName} does not exist`)
    }

    await new Promise((resolve, reject) => {
      const childProcess = fork(scriptPath, [], {
        stdio: "inherit",
        execArgv: ["--require", "ts-node/register/transpile-only"],
        env: { ...process.env },
      });

      childProcess.once("close", (status) => {
        this.log(`Script ${scriptPath} exited with status code ${status ?? "null"}`);
  
        resolve(status as number);
      });
      childProcess.once("error", reject);
    })
  }
}
