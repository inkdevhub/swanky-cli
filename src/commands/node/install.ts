import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ux, Flags } from "@oclif/core";
import { downloadNode, swankyNode } from "../../lib/index.js";
import path from "node:path";
import { writeJSON } from "fs-extra/esm";
import inquirer from "inquirer";
import { DEFAULT_NODE_INFO } from "../../lib/consts.js";
import { pickNodeVersion } from "../../lib/prompts.js";

export class InstallNode extends SwankyCommand<typeof InstallNode> {
  static description = "Install swanky node binary";

  static flags = {
    "set-version": Flags.string({
      description: "Specify version of swanky node to install",
      required: false,
    }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(InstallNode);
    if (flags.verbose) {
      this.spinner.verbose = true;
    }
    let nodeVersion= DEFAULT_NODE_INFO.version;

    if (flags.specifyVersion) {
      nodeVersion = flags.specifyVersion;
    } else {
      const versions = Array.from(swankyNode.keys());
      await inquirer.prompt([
        pickNodeVersion(versions),
      ]).then((answers) => {
        nodeVersion = answers.version;
      });
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

    const nodeInfo = swankyNode.get(nodeVersion)!;

    const taskResult = (await this.spinner.runCommand(
      () => downloadNode(projectPath, nodeInfo, this.spinner),
      "Downloading Swanky node"
    )) as string;
    const nodePath = path.relative(projectPath, taskResult);


    this.swankyConfig.node = {
      localPath: nodePath,
      polkadotPalletVersions: nodeInfo.polkadotPalletVersions,
      supportedInk: nodeInfo.supportedInk,
      version: nodeInfo.version,
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
