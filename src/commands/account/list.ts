import { Command, Flags } from "@oclif/core";
import { yellowBright, greenBright } from "chalk";
import { ensureSwankyProject, getSwankyConfig } from "../../lib/command-utils";

export class CreateAccount extends Command {
  static description = "List dev accounts stored in config";
  static aliases = [`account:ls`];
  static flags = {
    verbose: Flags.boolean({
      char: "v",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    await ensureSwankyProject();

    const { flags } = await this.parse(CreateAccount);

    const config = await getSwankyConfig();
    this.log(`${greenBright("✔")} Stored dev accounts:`);
    if (flags.verbose) {
      config.accounts.forEach((account) => {
        this.log(
          `\t${yellowBright("Alias: ")} ${account.alias.padEnd(
            12
          )} ${yellowBright("Mnemonic: ")} ${account.mnemonic}`
        );
      });
    } else {
      config.accounts.forEach((account) => {
        this.log(`\t${yellowBright("Alias: ")} ${account.alias}`);
      });
    }
  }
}
