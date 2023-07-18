import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ux } from "@oclif/core";
import { ensureSwankyProject, downloadNode, swankyNode } from "../../lib/index.js";
import path from "node:path";
import { writeJSON } from "fs-extra/esm";

export class InstallNode extends SwankyCommand {
  static description = "Install swanky node binary";

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { flags } = await this.parse(InstallNode);
    if (flags.verbose) {
      this.spinner.verbose = true;
    }

    const projectPath = path.resolve();

    if (this.swankyConfig.node.localPath !== "") {
      const overwrite = await ux.confirm(
        "Swanky node already installed. Do you want to overwrite it? (y/n)"
      );
      if (!overwrite) {
        return;
      }
    }

    const taskResult = (await this.spinner.runCommand(
      () => downloadNode(projectPath, swankyNode, this.spinner),
      "Downloading Swanky node"
    )) as string;
    const nodePath = path.relative(projectPath, taskResult);

    this.swankyConfig.node = {
      localPath: nodePath,
      polkadotPalletVersions: swankyNode.polkadotPalletVersions,
      supportedInk: swankyNode.supportedInk,
    };

    await this.spinner.runCommand(
      () =>
        writeJSON(path.resolve(projectPath, "swanky.config.json"), this.swankyConfig, {
          spaces: 2,
        }),
      "Updating swanky config"
    );

    this.log("Swanky Node Installed successfully");
  }
}
