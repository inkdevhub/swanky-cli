import chalk from "chalk";
import { ensureSwankyProject } from "../../lib/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";

export class CreateAccount extends SwankyCommand {
  static description = "List dev accounts stored in config";
  static aliases = [`account:ls`];

  async run(): Promise<void> {
    await ensureSwankyProject();

    this.log(`${chalk.greenBright("✔")} Stored dev accounts:`);

    for (const account of this.swankyConfig.accounts) {
      this.log(`\t${chalk.yellowBright("Alias: ")} ${account.alias}`);
    }
  }
}
