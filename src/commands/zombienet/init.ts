import path from "node:path";
import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { downloadZombinetBinary, getSwankyConfig, getTemplates, Spinner } from "../../lib/index.js";
import { pathExistsSync } from "fs-extra/esm";
import inquirer from "inquirer";
import { copy, ensureDir } from "fs-extra/esm";
import { zombienetBins } from "../../lib/zombienetInfo.js";


export const zombienetConfig = "zombienet.config.toml";
export const providerChoices = ["native", "k8s"];

export class InitZombienet extends SwankyCommand<typeof InitZombienet> {
  static description = "Initialize Zomnienet";

  static flags = {
    provider: Flags.string({ char: "p", description: "Provider to use" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitZombienet);
    await getSwankyConfig();

    const spinner = new Spinner(flags.verbose);

    const projectPath = path.resolve();
    if (pathExistsSync(path.resolve(projectPath, "zombienet", "bin", "zombienet"))) {
      this.error("Zombienet config already initialized");
    }

    const zombienetTemplatePath = getTemplates().zombienetTemplatesPath;

    let provider = flags.provider;
    if (provider === undefined) {
      const answer = await inquirer.prompt([{
        name: "provider",
        type: "list",
        choices: providerChoices,
        message: "Select a provider to use",
      }])
      provider = answer.provider;
    }

    const configPath = path.resolve(projectPath, "zombienet", "config")
    // Copy templates
    await spinner.runCommand(
      () =>
        copyTemplateFile(path.resolve(zombienetTemplatePath, provider!), path.resolve(configPath, provider!)),
      "Copying template files"
    );

    // Install binaries based on zombie config
    await this.spinner.runCommand(
      () => downloadZombinetBinary(projectPath, zombienetBins, "zombienet", this.spinner),
      "Downloading Zombienet"
    );

    await this.spinner.runCommand(
      () => downloadZombinetBinary(projectPath, zombienetBins, "polkadot", this.spinner),
      "Downloading Polkadot"
    );

    await this.spinner.runCommand(
      () => downloadZombinetBinary(projectPath, zombienetBins, "astar-collator", this.spinner),
      "Downloading Astar Collator"
    );

    this.log("ZombieNet config Installed successfully");
  }
}

export async function copyTemplateFile(templatePath: string, projectPath: string) {
  await ensureDir(projectPath);
  await copy(
    path.resolve(templatePath, zombienetConfig),
    path.resolve(projectPath, zombienetConfig)
  );
}