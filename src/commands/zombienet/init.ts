import path from "node:path";
import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import {
  buildZombienetConfigFromBinaries,
  copyZombienetTemplateFile,
  downloadZombienetBinaries,
  getSwankyConfig,
  getTemplates,
  osCheck,
  Spinner,
} from "../../lib/index.js";
import { pathExistsSync } from "fs-extra/esm";
import { zombienet, zombienetBinariesList } from "../../lib/zombienetInfo.js";
import { ConfigBuilder } from "../../lib/config-builder.js";
import { SwankyConfig, ZombienetData } from "../../index.js";

export const zombienetConfig = "zombienet.config.toml";

export class InitZombienet extends SwankyCommand<typeof InitZombienet> {
  static description = "Initialize Zombienet";

  static flags = {
    binaries: Flags.string({
      char: "b",
      multiple: true,
      required: false,
      options: zombienetBinariesList,
      default: [],
      description: "Binaries to install",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitZombienet);

    const localConfig = getSwankyConfig("local") as SwankyConfig;

    const platform = osCheck().platform;
    if (platform === "darwin") {
      this.warn(`Note for MacOs users: Polkadot binary is not currently supported for MacOs.
As a result users of MacOS need to clone the Polkadot repo (https://github.com/paritytech/polkadot), create a release and add it in your PATH manually (setup will advice you so as well). Check the official zombienet documentation for manual settings: https://paritytech.github.io/zombienet/.`);
    }

    const projectPath = path.resolve();
    if (pathExistsSync(path.resolve(projectPath, "zombienet", "bin", "zombienet"))) {
      this.error("Zombienet config already initialized");
    }

    const spinner = new Spinner(flags.verbose);

    const zombienetData: ZombienetData = {
      version: zombienet.version,
      downloadUrl: zombienet.downloadUrl,
      binaries: {},
    };

    if (!flags.binaries.includes("polkadot")) {
      flags.binaries.push("polkadot");
    }

    for (const binaryName of flags.binaries) {
      if (platform === "darwin" && binaryName.startsWith("polkadot")) {
        continue;
      }
      if (!Object.keys(zombienet.binaries).includes(binaryName)) {
        this.error(`Binary ${binaryName} not found in Zombienet config`);
      }
      zombienetData.binaries[binaryName] = zombienet.binaries[binaryName as keyof typeof zombienet.binaries];
    }

    await this.spinner.runCommand(async () => {
      const newLocalConfig = new ConfigBuilder(localConfig)
        .addZombienet(zombienetData)
        .build();
      await this.storeConfig(newLocalConfig, "local");
    }, "Writing config");

    const zombienetTemplatePath = getTemplates().zombienetTemplatesPath;

    const configPath = path.resolve(projectPath, "zombienet", "config");

    if (flags.binaries.length === 1 && flags.binaries[0] === "polkadot") {
      await spinner.runCommand(
        () =>
          copyZombienetTemplateFile(zombienetTemplatePath, configPath),
        "Copying template files",
      );
    } else {
      await spinner.runCommand(
        () => buildZombienetConfigFromBinaries(flags.binaries, zombienetTemplatePath, configPath),
        "Copying template files",
      );
    }

    // Install binaries based on zombie config
    await this.spinner.runCommand(
      () => downloadZombienetBinaries(flags.binaries, projectPath, localConfig, this.spinner),
      "Downloading Zombienet binaries",
    );

    this.log("ZombieNet config Installed successfully");
  }
}

