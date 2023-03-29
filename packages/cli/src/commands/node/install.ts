import { BaseCommand } from "../../lib/baseCommand";
import { ux } from "@oclif/core";
import { ensureSwankyProject, getSwankyConfig, Spinner, downloadNode, swankyNode } from "@astar-network/swanky-core";
import path = require("node:path");
import { writeJSON } from "fs-extra";

export class InstallNode extends BaseCommand<typeof InstallNode> {
  static description = "Install swanky node binary";

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { flags } = await this.parse(InstallNode);
    const config = await getSwankyConfig();
    const spinner = new Spinner(flags.verbose);

    const projectPath = path.resolve();

    if (config.node.localPath !== "") {
        const overwrite = await ux.confirm("Swanky node already installed. Do you want to overwrite it? (y/n)");
        if (!overwrite) {
            return;
        }
    }

    const taskResult = (await spinner.runCommand(
        () => downloadNode(projectPath, swankyNode, spinner),
        "Downloading Swanky node"
    )) as string;
    const nodePath = path.relative(projectPath, taskResult);

    config.node = {
        localPath: nodePath,
        polkadotPalletVersions: swankyNode.polkadotPalletVersions,
        supportedInk: swankyNode.supportedInk,
    }

    await spinner.runCommand(
        () => writeJSON(path.resolve(projectPath, "swanky.config.json"), config, { spaces: 2 }),
        "Updating swanky config"
    );

    this.log("Swanky Node Installed successfully");
  }
}
