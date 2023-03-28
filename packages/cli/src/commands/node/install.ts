import { Command, Flags } from "@oclif/core";
import { ensureSwankyProject, getSwankyConfig, Spinner, downloadNode, swankyNode } from "@astar-network/swanky-core";
import inquirer = require("inquirer");
import path = require("node:path");
import { writeJSON } from "fs-extra";
import { choice } from "../../lib/prompts";

export class InstallNode extends Command {
  static description = "Install swanky node binary";

  static flags = {
    verbose: Flags.boolean({ char: "v" }),
  };

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { flags } = await this.parse(InstallNode);
    const config = await getSwankyConfig();
    const spinner = new Spinner(flags.verbose);

    const projectPath = path.resolve();

    if (config.node.localPath !== "") {
        const answers = await inquirer.prompt([
            choice("overwrite", "Swanky node already installed. Do you want to overwrite it?")
        ]);
        if (!answers.overwrite) {
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
