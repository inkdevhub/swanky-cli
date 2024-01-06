import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import path from "node:path";
import { existsSync } from "fs-extra";
import { Spinner } from "../../lib/index.js";
import { zombienetConfig } from "./init.js";
import { execaCommand } from "execa";


export class StartZombienet extends SwankyCommand<typeof StartZombienet> {
  static description = "Start Zomnienet";

  static flags = {
    verbose: Flags.boolean({ char: "v", description: "Verbose output" }),
    provider: Flags.string({ char: "p", description: "Provider to use", default: "native" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StartZombienet);

    const projectPath = path.resolve();
    const binPath = path.resolve(projectPath, "zombienet", "bin")
    if (!existsSync(path.resolve(binPath, "zombienet"))) {
      this.error("Zombienet has not initialized. Run `swanky zombienet:init` first");
    }

    const spinner = new Spinner(flags.verbose);

    const configFilePath = path.resolve(projectPath, "zombienet", "config", flags.provider, zombienetConfig);

    if (!existsSync(configFilePath)) {
      this.error(`Zombienet config for ${flags.provider} does not exist. Add provider config first.`);
    }

    await execaCommand(
        `./zombienet/bin/zombienet \
            spawn --provider ${flags.provider} \
            ./zombienet/config/${flags.provider}/zombienet.config.toml
        `,
        {
          stdio: "inherit",
        }
    );

    this.log("ZombieNet started successfully");
  }
}