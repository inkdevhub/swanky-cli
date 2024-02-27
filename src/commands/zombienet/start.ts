import { SwankyCommand } from "../../lib/swankyCommand.js";
import path from "node:path";
import { pathExistsSync } from "fs-extra/esm";
import { execaCommand } from "execa";
import { Flags } from "@oclif/core";


export class StartZombienet extends SwankyCommand<typeof StartZombienet> {
  static description = "Start Zombienet";

  static flags = {
    "config-path": Flags.string({
      char: "c",
      required: false,
      default: "./zombienet/config/zombienet.config.toml",
      description: "Path to zombienet config",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StartZombienet);
    const projectPath = path.resolve();
    const binPath = path.resolve(projectPath, "zombienet", "bin")
    if (!pathExistsSync(path.resolve(binPath, "zombienet"))) {
      this.error("Zombienet has not initialized. Run `swanky zombienet:init` first");
    }

    await execaCommand(
        `./zombienet/bin/zombienet \
            spawn --provider native \
            ${flags["config-path"]}
        `,
        {
          stdio: "inherit",
        }
    );

    this.log("ZombieNet started successfully");
  }
}