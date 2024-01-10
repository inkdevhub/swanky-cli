import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import path from "node:path";
import { pathExistsSync } from "fs-extra/esm";
import { execaCommand } from "execa";
import inquirer from "inquirer";
import { readdirSync } from "fs";


export class StartZombienet extends SwankyCommand<typeof StartZombienet> {
  static description = "Start Zomnienet";

  static flags = {
    provider: Flags.string({ char: "p", description: "Provider to use", default: "native" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StartZombienet);

    const projectPath = path.resolve();
    const binPath = path.resolve(projectPath, "zombienet", "bin")
    if (!pathExistsSync(path.resolve(binPath, "zombienet"))) {
      this.error("Zombienet has not initialized. Run `swanky zombienet:init` first");
    }

    const zombienetConfigPath = path.resolve("zombienet", "config", flags.provider);

    const configList = readdirSync(zombienetConfigPath);

    const zombienetConfig = (await inquirer.prompt([{
      name: "zombienetConfig",
      type: "list",
      choices: configList,
      message: "Select a zombienet config to use",
    }])).zombienetConfig;

    const configFilePath = path.resolve(zombienetConfigPath, zombienetConfig);

    if (!pathExistsSync(configFilePath)) {
      this.error(`Zombienet config for ${flags.provider} does not exist. Add provider config first.`);
    }

    await execaCommand(
        `./zombienet/bin/zombienet \
            spawn --provider ${flags.provider} \
            ./zombienet/config/${flags.provider}/${zombienetConfig}
        `,
        {
          stdio: "inherit",
        }
    );

    this.log("ZombieNet started successfully");
  }
}