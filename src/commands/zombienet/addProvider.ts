import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import path from "node:path";
import { pathExistsSync } from "fs-extra/esm";
import { getTemplates, Spinner } from "../../lib/index.js";
import inquirer from "inquirer";
import { copyTemplateFile, providerChoices, zombienetConfig } from "./init.js";


export class AddZombienetProvider extends SwankyCommand<typeof AddZombienetProvider>{
  static description = "Add Zombienet provider config";

  static flags = {
    provider: Flags.string({ char: "p", description: "Provider to use" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AddZombienetProvider);

    const projectPath = path.resolve();
    const binPath = path.resolve(projectPath, "zombienet", "bin")
    if (!pathExistsSync(path.resolve(binPath, "zombienet"))) {
      this.error("Zombienet has not initialized. Run `swanky zombienet:init` first");
    }

    const zombienetTemplatePath = getTemplates().zombienetTemplatesPath;


    const spinner = new Spinner(flags.verbose);

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

    if (pathExistsSync(path.resolve(configPath, provider!, zombienetConfig))) {
      this.error(`Zombienet config for ${provider!} provider already exists`);
    }

    // Copy templates
    await spinner.runCommand(
      () =>
        copyTemplateFile(path.resolve(zombienetTemplatePath, provider!), path.resolve(configPath, provider!)),
      "Copying template files"
    );

    this.log("Zombienet provider config added successfully");
  }
}
