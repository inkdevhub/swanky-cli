import { BaseCommand } from "../../lib/baseCommand";
import { ux } from "@oclif/core";
import { ensureSwankyProject, downloadNode, swankyNode } from "@astar-network/swanky-core";
import path = require("node:path");
import { writeJSON } from "fs-extra";

export class InstallNode extends BaseCommand<typeof InstallNode> {
  static description = "Install swanky node binary";

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { flags } = await this.parse(InstallNode);
    if (flags.verbose) {
        this.spinner.verbose = true;
    }

    const projectPath = path.resolve();

    if (this.swankyConfig.node.localPath !== "") {
        const overwrite = await ux.confirm("Swanky node already installed. Do you want to overwrite it? (y/n)");
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
    }

    await this.spinner.runCommand(
        () => writeJSON(path.resolve(projectPath, "swanky.config.json"), this.swankyConfig, { spaces: 2 }),
        "Updating swanky config"
    );

    this.log("Swanky Node Installed successfully");
  }
}
