import { SwankyCommand } from "../../lib/swankyCommand.js";
import path from "node:path";
import { pathExistsSync } from "fs-extra/esm";
import { execaCommand } from "execa";
import inquirer from "inquirer";
import { readdirSync } from "fs";


export class StartZombienet extends SwankyCommand<typeof StartZombienet> {
  static description = "Start Zomnienet";

  async run(): Promise<void> {
    const projectPath = path.resolve();
    const binPath = path.resolve(projectPath, "zombienet", "bin")
    if (!pathExistsSync(path.resolve(binPath, "zombienet"))) {
      this.error("Zombienet has not initialized. Run `swanky zombienet:init` first");
    }

    const zombienetConfigPath = path.resolve("zombienet", "config");

    const configList = readdirSync(zombienetConfigPath);

    const zombienetConfig = (await inquirer.prompt([{
      name: "zombienetConfig",
      type: "list",
      choices: configList,
      message: "Select a zombienet config to use",
    }])).zombienetConfig;

    await execaCommand(
        `./zombienet/bin/zombienet \
            spawn --provider native \
            ./zombienet/config/${zombienetConfig}
        `,
        {
          stdio: "inherit",
        }
    );

    this.log("ZombieNet started successfully");
  }
}