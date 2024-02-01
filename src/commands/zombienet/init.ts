import path from "node:path";
import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import {
  copyZombienetTemplateFile, downloadZombienetBinaries,
  buildZombienetConfigFromBinaries,
  getSwankyConfig,
  getTemplates,
  Spinner,
} from "../../lib/index.js";
import { pathExistsSync } from "fs-extra/esm";
import { zombienet } from "../../lib/zombienetInfo.js";

export const zombienetConfig = "zombienet.config.toml";
export class InitZombienet extends SwankyCommand<typeof InitZombienet> {
  static description = "Initialize Zombienet";

  static flags = {
    binaries: Flags.string({
      char: "b",
      multiple: true,
      required: false,
      default: [],
      description: "Binaries to install",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitZombienet);
    await getSwankyConfig();

    const projectPath = path.resolve();
    if (pathExistsSync(path.resolve(projectPath, "zombienet", "bin", "zombienet"))) {
      this.error("Zombienet config already initialized");
    }

    const spinner = new Spinner(flags.verbose);

    this.swankyConfig.zombienet = {
      version: zombienet.version,
      downloadUrl: zombienet.downloadUrl,
      binaries: {},
    };

    if(!flags.binaries.includes("polkadot")) {
      flags.binaries.push("polkadot");
    }

    for(const binaryName of flags.binaries){
      if(!Object.keys(zombienet.binaries).includes(binaryName)) {
        this.error(`Binary ${binaryName} not found in Zombienet config`);
      }
      this.swankyConfig.zombienet.binaries[binaryName] = zombienet.binaries[binaryName as keyof typeof zombienet.binaries];
    }

    await this.storeConfig();

    const zombienetTemplatePath = getTemplates().zombienetTemplatesPath;

    const configPath = path.resolve(projectPath, "zombienet", "config")

    if(flags.binaries.length < 2) {
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
      () => downloadZombienetBinaries(flags.binaries, projectPath, this.swankyConfig, this.spinner),
      "Downloading Zombienet binaries"
    );



    this.log("ZombieNet config Installed successfully");
  }
}

