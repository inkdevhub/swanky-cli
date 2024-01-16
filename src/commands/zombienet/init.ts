import path from "node:path";
import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import {
  copyZombienetTemplateFile, downloadZombinetBinaries,
  buildZombienetConfigFromBinaries,
  getSwankyConfig,
  getTemplates,
  Spinner,
} from "../../lib/index.js";
import { pathExistsSync } from "fs-extra/esm";

export const zombienetConfig = "zombienet.config.toml";
export class InitZombienet extends SwankyCommand<typeof InitZombienet> {
  static description = "Initialize Zomnienet";

  static flags = {
    binaries: Flags.string({
      char: "b",
      multiple: true,
      required: true,
      description: "Binaries to install",
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(InitZombienet);
    await getSwankyConfig();

    const spinner = new Spinner(flags.verbose);

    const projectPath = path.resolve();
    if (pathExistsSync(path.resolve(projectPath, "zombienet", "bin", "zombienet"))) {
      this.error("Zombienet config already initialized");
    }

    const zombienetTemplatePath = getTemplates().zombienetTemplatesPath;

    const configPath = path.resolve(projectPath, "zombienet", "config")

    if(!flags.binaries || flags.binaries.length < 2) {
      await spinner.runCommand(
        () =>
          copyZombienetTemplateFile(zombienetTemplatePath, configPath),
        "Copying template files"
      );
    }
    else {
      await spinner.runCommand(
        () => buildZombienetConfigFromBinaries(flags.binaries, zombienetTemplatePath, configPath),
        "Copying template files"
      );
    }

    // Install binaries based on zombie config
    await this.spinner.runCommand(
      () => downloadZombinetBinaries(projectPath, this.swankyConfig, this.spinner),
      "Downloading Zombienet binaries"
    );



    this.log("ZombieNet config Installed successfully");
  }
}

