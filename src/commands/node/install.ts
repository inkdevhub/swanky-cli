import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import { downloadNode, getSwankyConfig, swankyNodeVersions } from "../../lib/index.js";
import path from "node:path";
import inquirer from "inquirer";
import { ConfigBuilder } from "../../lib/config-builder.js";
import { DEFAULT_NODE_INFO } from "../../lib/consts.js";
import { choice, pickNodeVersion } from "../../lib/prompts.js";
import { InputError } from "../../lib/errors.js";

export class InstallNode extends SwankyCommand<typeof InstallNode> {
  static description = "Install swanky node binary";

  static flags = {
    "set-version": Flags.string({
      description: "Specify version of swanky node to install. \n List of supported versions: " + Array.from(swankyNodeVersions.keys()).join(", "),
      required: false,
    }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(InstallNode);
    if (flags.verbose) {
      this.spinner.verbose = true;
    }
    let nodeVersion= DEFAULT_NODE_INFO.version;

    if (flags["set-version"]) {
      nodeVersion = flags["set-version"];
      if(!swankyNodeVersions.has(nodeVersion)) {
        throw new InputError(`Version ${nodeVersion} is not supported.\n List of supported versions: ${Array.from(swankyNodeVersions.keys()).join(", ")}`);
      }
    } else {
      const versions = Array.from(swankyNodeVersions.keys());
      await inquirer.prompt([
        pickNodeVersion(versions),
      ]).then((answers) => {
        nodeVersion = answers.version;
      });
    }

    const projectPath = path.resolve();

    if (this.swankyConfig.node.localPath !== "") {
      const { overwrite } =await inquirer.prompt([
        choice("overwrite", "Swanky node already installed. Do you want to overwrite it?"),
      ]);
      if (!overwrite) {
        return;
      }
    }

    const nodeInfo = swankyNodeVersions.get(nodeVersion)!;

    const taskResult = (await this.spinner.runCommand(
      () => downloadNode(projectPath, nodeInfo, this.spinner),
      "Downloading Swanky node"
    )) as string;
    const nodePath = path.resolve(projectPath, taskResult);

    await this.spinner.runCommand(async () => {
      const newLocalConfig = new ConfigBuilder(getSwankyConfig("local"))
        .updateNodeSettings({
          localPath: nodePath,
          polkadotPalletVersions: nodeInfo.polkadotPalletVersions,
          supportedInk: nodeInfo.supportedInk,
          version: nodeInfo.version,
        })
        .build();
      await this.storeConfig(newLocalConfig, "local");
    }, "Updating swanky config");

    this.log("Swanky Node Installed successfully");
  }
}
