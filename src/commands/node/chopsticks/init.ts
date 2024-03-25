import path from "node:path";
import { SwankyCommand } from "../../../lib/swankyCommand.js";
import { copyChopsticksTemplateFile, getSwankyConfig, getTemplates } from "../../../lib/index.js";
import { ConfigBuilder } from "../../../lib/config-builder.js";
import { SwankyConfig } from "../../../types/index.js";

export const chopsticksConfig = "dev.yml";

export class InitChopsticks extends SwankyCommand<typeof InitChopsticks> {
  static description = "Initialize chopsticks config";

  async run(): Promise<void> {
    const localConfig = getSwankyConfig("local") as SwankyConfig;
    const projectPath = path.resolve();

    const chopsticksTemplatePath = getTemplates().chopsticksTemplatesPath;
    const configPath = path.resolve(projectPath, "node", "config");

    await this.spinner.runCommand(
      () => copyChopsticksTemplateFile(chopsticksTemplatePath, configPath),
      "Copying Chopsticks template files..."
    );

    await this.spinner.runCommand(async () => {
      const newLocalConfig = new ConfigBuilder(localConfig)
        .addChopsticks(path.resolve(projectPath, "node", "config", chopsticksConfig))
        .build();
      await this.storeConfig(newLocalConfig, "local");
    }, "Updating Swanky configuration with Chopsticks settings...");

    this.log("Chopsticks config initialized successfully");
  }
}
