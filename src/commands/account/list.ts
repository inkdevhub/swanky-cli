import { Command, Flags } from "@oclif/core";
import { yellowBright, greenBright } from "chalk";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";

export class CreateAccount extends Command {
  static description = "List dev accounts stored in config";
  static aliases = [`account:ls`];

  async run(): Promise<void> {
    await ensureSwankyProject();

    const config = await getSwankyConfig();
    this.log(`${greenBright("✔")} Stored dev accounts:`);

    config.accounts.forEach((account) => {
      this.log(`\t${yellowBright("Alias: ")} ${account.alias}`);
    });
  }
}
