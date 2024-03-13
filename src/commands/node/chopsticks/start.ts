import { Flags } from "@oclif/core";
import { execaCommand } from "execa";
import { SwankyCommand } from "../../../lib/swankyCommand.js";
import { ensureSwankyNodeInstalled } from "../../../lib/index.js";
import { pathExists } from "fs-extra/esm";
import { ConfigError, FileError } from "../../../lib/errors.js";
export class StartChopsticks extends SwankyCommand<typeof StartChopsticks> {
  static description = "Start chopsticks";

  static flags = {
    "config": Flags.string({
      description: "Path to the chopsticks config file",
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(StartChopsticks);

    ensureSwankyNodeInstalled(this.swankyConfig);

    const chopsticksConfigPath = flags.config ?? this.swankyConfig.node.chopsticks?.configPath;

    if(!chopsticksConfigPath) {
      throw new ConfigError("Chopsticks config not set in swanky config. Please set it in swanky config or provide the path to the chopsticks config file using --config flag.");
    }

    if (!(await pathExists(chopsticksConfigPath))) {
      throw new FileError(`Chopsticks config file not found at ${flags.config}`);
    }

    await execaCommand(
      `npx @acala-network/chopsticks@latest --config=${chopsticksConfigPath}`,
      {
        stdio: "inherit",
      }
    );

    this.log("Chopsticks started successfully.");
  }
}
